// supabase/functions/aura-push-notify/index.ts
// Runs on a cron schedule — sends real Web Push to all subscribed users.
// Checks:
//   1. notifications_queue rows (target = 'all' or specific user_id, sent = false)
//   2. AQI threshold alerts for each user's saved location (if location saved)
//
// Deploy: supabase functions deploy aura-push-notify
// Cron:   supabase functions schedule aura-push-notify --schedule "*/15 * * * *"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── VAPID Web Push helpers ────────────────────────────────────────────────────
// Minimal VAPID/web-push implementation (no npm — Deno-compatible)

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@aura.app"

function base64urlToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4)
  const base64  = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw     = atob(base64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

async function makeVapidHeaders(audience: string): Promise<Record<string, string>> {
  const now   = Math.floor(Date.now() / 1000)
  const exp   = now + 12 * 3600

  // JWT header + payload
  const header  = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const payload = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT })))
  const sigInput = `${header}.${payload}`

  // Import VAPID private key (raw d value)
  const privRaw = base64urlToUint8Array(VAPID_PRIVATE_KEY)
  const pubRaw  = base64urlToUint8Array(VAPID_PUBLIC_KEY)

  // Build JWK for ES256 private key
  const jwk = {
    kty: "EC", crv: "P-256",
    x: uint8ArrayToBase64url(pubRaw.slice(1, 33)),
    y: uint8ArrayToBase64url(pubRaw.slice(33, 65)),
    d: uint8ArrayToBase64url(privRaw),
    ext: true,
  }
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(sigInput))
  const jwt = `${sigInput}.${uint8ArrayToBase64url(new Uint8Array(sig))}`

  return {
    Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    "Content-Type": "application/json",
    TTL: "86400",
  }
}

interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

async function encryptPayload(sub: PushSubscription, payload: string): Promise<{ body: Uint8Array; salt: string; serverPublicKey: string }> {
  // Generate ephemeral ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
  const serverPubJwk  = await crypto.subtle.exportKey("jwk", serverKeyPair.publicKey)
  const serverPubRaw  = new Uint8Array([0x04,
    ...base64urlToUint8Array(serverPubJwk.x!),
    ...base64urlToUint8Array(serverPubJwk.y!),
  ])

  // Import recipient public key
  const clientPubRaw  = base64urlToUint8Array(sub.keys.p256dh)
  const clientKey     = await crypto.subtle.importKey("raw", clientPubRaw, { name: "ECDH", namedCurve: "P-256" }, false, [])

  // ECDH shared secret
  const sharedBits    = await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeyPair.privateKey, 256)

  // Auth secret
  const authSecret    = base64urlToUint8Array(sub.keys.auth)
  const salt          = crypto.getRandomValues(new Uint8Array(16))

  // HKDF to get content encryption key + nonce
  const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveBits"])
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: new TextEncoder().encode("Content-Encoding: auth\0") },
    hkdfKey, 256
  )
  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, ["deriveBits"])

  // Key info
  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: aesgcm\0"),
    ...new Uint8Array([0x00, 0x41]), // p256dh label + len
    ...serverPubRaw,
    ...new Uint8Array([0x00, 0x41]),
    ...clientPubRaw,
  ])
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: nonce\0"),
    ...new Uint8Array([0x00, 0x41]),
    ...serverPubRaw,
    ...new Uint8Array([0x00, 0x41]),
    ...clientPubRaw,
  ])

  const rawKey   = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: keyInfo }, prkKey, 128)
  const rawNonce = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96)

  const aesKey   = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"])
  const nonce    = new Uint8Array(rawNonce)

  // Pad payload (2-byte big-endian padding length + payload)
  const textBytes    = new TextEncoder().encode(payload)
  const padded       = new Uint8Array([0, 0, ...textBytes])
  const ciphertext   = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)

  return {
    body: new Uint8Array(ciphertext),
    salt: uint8ArrayToBase64url(salt),
    serverPublicKey: uint8ArrayToBase64url(serverPubRaw),
  }
}

async function sendWebPush(sub: PushSubscription, message: { title: string; body: string; tag?: string; url?: string }): Promise<boolean> {
  try {
    const origin  = new URL(sub.endpoint).origin
    const headers = await makeVapidHeaders(origin)
    const { body, salt, serverPublicKey } = await encryptPayload(sub, JSON.stringify(message))

    const res = await fetch(sub.endpoint, {
      method:  "POST",
      headers: {
        ...headers,
        "Content-Encoding": "aesgcm",
        "Encryption": `salt=${salt}`,
        "Crypto-Key": `dh=${serverPublicKey};vapid="${headers.Authorization.split("t=")[1].split(",")[0]}"`,
        "Content-Length": String(body.byteLength),
      },
      body,
    })
    return res.ok || res.status === 201
  } catch (err) {
    console.error("[Push] sendWebPush failed:", err)
    return false
  }
}

// ── AQI helpers ───────────────────────────────────────────────────────────────
function aqiLabel(aqi: number): string {
  if (aqi <= 50)  return "Good"
  if (aqi <= 100) return "Moderate"
  if (aqi <= 150) return "Unhealthy for Sensitive Groups"
  if (aqi <= 200) return "Unhealthy"
  if (aqi <= 300) return "Very Unhealthy"
  return "Hazardous"
}

async function fetchCurrentAqi(lat: number, lng: number): Promise<number | null> {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&timezone=Asia%2FManila&forecast_days=1`
    const res  = await fetch(url)
    const data = await res.json()
    if (!data.hourly?.us_aqi) return null
    const now  = new Date().toISOString().slice(0, 13)
    const idx  = data.hourly.time.findIndex((t: string) => t.startsWith(now))
    return data.hourly.us_aqi[idx !== -1 ? idx : data.hourly.us_aqi.length - 1]
  } catch { return null }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Allow cron trigger (GET) or manual trigger (POST)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  let pushed = 0
  let failed = 0

  // ── 1. notifications_queue broadcast ──────────────────────────────────────
  const { data: queueItems } = await supabase
    .from("notifications_queue")
    .select("*")
    .eq("sent", false)
    .order("created_at", { ascending: true })

  if (queueItems?.length) {
    const { data: allSubs } = await supabase
      .from("push_subscriptions")
      .select("user_id, subscription")

    for (const item of queueItems) {
      const targets = (allSubs || []).filter(s =>
        item.target === "all" || s.user_id === item.target
      )

      for (const { subscription } of targets) {
        if (!subscription?.endpoint) continue
        const ok = await sendWebPush(subscription, {
          title: item.title,
          body:  item.body,
          tag:   "aura-broadcast",
          url:   "/",
        })
        ok ? pushed++ : failed++
      }

      // Mark sent
      await supabase.from("notifications_queue").update({ sent: true }).eq("id", item.id)
    }
  }

  // ── 2. AQI threshold alerts per user ──────────────────────────────────────
  // Only runs when no queue items, to avoid double-notifying
  if (!queueItems?.length) {
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("user_id, subscription, last_aqi_notif_level")

    console.log("[AQI] subs found:", subs?.length, "error:", subsError)

    for (const sub of subs || []) {
      if (!sub.subscription?.endpoint) { console.log("[AQI] skipping - no endpoint"); continue }

      const { data: profile, error: profError } = await supabase
        .from("profiles")
        .select("lat, lng, aqi_alert_threshold")
        .eq("id", sub.user_id)
        .single()

      console.log("[AQI] user:", sub.user_id, "profile:", profile, "error:", profError)

      if (!profile?.lat || !profile?.lng) { console.log("[AQI] skipping - no lat/lng"); continue }

      const threshold = profile.aqi_alert_threshold ?? 100
      const aqi = await fetchCurrentAqi(profile.lat, profile.lng)
      console.log("[AQI] aqi:", aqi, "threshold:", threshold)
      if (aqi === null) { console.log("[AQI] skipping - aqi null"); continue }

      const prevLevel = sub.last_aqi_notif_level ?? 0
      const crossed   = aqi > threshold && prevLevel <= threshold
      const recovered = aqi <= threshold && prevLevel > threshold

      // Daily summary: always send at 7am, 12pm, 7pm PHT (23, 4, 11 UTC)
      const utcHour = new Date().getUTCHours()
      const isDailySummaryHour = [23, 4, 11].includes(utcHour)

      if (crossed) {
        const ok = await sendWebPush(sub.subscription, {
          title: `⚠️ Air Quality Alert`,
          body:  `AQI is now ${aqi} — ${aqiLabel(aqi)}. Take precautions.`,
          tag:   "aura-aqi-alert",
          url:   "/dashboard",
        })
        ok ? pushed++ : failed++
        await supabase.from("push_subscriptions").update({ last_aqi_notif_level: aqi }).eq("user_id", sub.user_id)
      } else if (recovered) {
        const ok = await sendWebPush(sub.subscription, {
          title: `✅ Air Quality Improved`,
          body:  `AQI is now ${aqi} — ${aqiLabel(aqi)}. Air is safe again.`,
          tag:   "aura-aqi-recovery",
          url:   "/dashboard",
        })
        ok ? pushed++ : failed++
        await supabase.from("push_subscriptions").update({ last_aqi_notif_level: aqi }).eq("user_id", sub.user_id)
      } else if (isDailySummaryHour) {
        const label = aqiLabel(aqi)
        const emoji = aqi <= 50 ? "🟢" : aqi <= 100 ? "🟡" : aqi <= 150 ? "🟠" : "🔴"
        const ok = await sendWebPush(sub.subscription, {
          title: `${emoji} Daily Air Update`,
          body:  `Current AQI: ${aqi} — ${label}`,
          tag:   "aura-daily-summary",
          url:   "/dashboard",
        })
        ok ? pushed++ : failed++
      }
    }
  }

  return new Response(JSON.stringify({ pushed, failed, ts: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  })
})