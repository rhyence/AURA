// Air Quality Service — AQICN (WAQI) city-feed via Supabase Edge Function proxy

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY
const PROXY_BASE   = `${SUPABASE_URL}/functions/v1/aqicn-proxy`
const AUTH         = { "Authorization": `Bearer ${ANON_KEY}` }

const NCR_TO_SLUG = {
  "manila": "manila", "makati": "manila", "quezon-city": "manila",
  "quezon city": "manila", "pasig": "manila", "taguig": "manila",
  "mandaluyong": "manila", "pasay": "manila", "paranaque": "manila",
  "parañaque": "manila", "las-pinas": "manila", "las piñas": "manila",
  "las pinas": "manila", "muntinlupa": "manila", "marikina": "manila",
  "caloocan": "manila", "malabon": "manila", "navotas": "manila",
  "valenzuela": "manila", "san juan": "manila", "pateros": "manila",
  "metro manila": "manila", "ncr": "manila",
}

const PM25_BP = [
  [0.0,   9.0,   0,   50],
  [9.1,   35.4,  51,  100],
  [35.5,  55.4,  101, 150],
  [55.5,  125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
]

export function pm25ToAqi(c) {
  if (c == null) return null
  for (const [cLo, cHi, aLo, aHi] of PM25_BP) {
    if (c >= cLo && c <= cHi)
      return Math.round(((aHi - aLo) / (cHi - cLo)) * (c - cLo) + aLo)
  }
  return null
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    )
    const json = await res.json()
    const a = json.address || {}
    return (a.city || a.town || a.municipality || a.county || "manila").toLowerCase()
  } catch {
    return "manila"
  }
}

function resolveSlug(city) {
  const lower = city.toLowerCase()
  return NCR_TO_SLUG[lower] ?? lower.replace(/\s+/g, "-")
}

async function fetchCity(slug) {
  const path = encodeURIComponent(`/feed/${slug}/`)
  const res  = await fetch(`${PROXY_BASE}?path=${path}`, { headers: AUTH })
  if (!res.ok) throw new Error(`aqicn-proxy ${res.status}`)
  return res.json()
}

function normalize(json) {
  console.log("[AQICN] raw response:", JSON.stringify(json).slice(0, 300))
  if (!json || json.status !== "ok") {
    console.warn("[AQICN] normalize bail: status=", json?.status, "data=", json?.data)
    return null
  }
  const d   = json.data
  const aqi = Number(d?.aqi)
  console.log("[AQICN] d.aqi=", d?.aqi, "→ Number=", aqi, "isNaN=", isNaN(aqi))
  if (!d || isNaN(aqi)) return null

  const g = (key) => d.iaqi?.[key]?.v ?? null

  const raw_fc = d.forecast?.daily?.pm25 ?? d.forecast?.daily?.o3 ?? []
  const forecasts_daily = raw_fc.map(f => ({
    ts: f.day, aqius: f.avg, min: f.min, max: f.max,
  }))

  return {
    aqi,
    pm25:            g("pm25"),
    pm10:            g("pm10"),
    o3:              g("o3"),
    no2:             g("no2"),
    so2:             g("so2"),
    co:              g("co"),
    time:            d.time?.iso ?? new Date().toISOString(),
    source:          "aqicn",
    stationName:     d.city?.name ?? "Manila, Philippines",
    forecasts_daily,
  }
}

export async function fetchAirQuality(lat, lng) {
  try {
    const city = await reverseGeocode(lat, lng)
    const slug = resolveSlug(city)
    console.log(`[AQICN] city="${city}" → slug="${slug}"`)

    let result = normalize(await fetchCity(slug))

    if (!result && slug !== "manila") {
      console.log(`[AQICN] no data for "${slug}", falling back to manila`)
      result = normalize(await fetchCity("manila"))
    }

    console.log("[AQICN] final result:", result)
    return result
  } catch (err) {
    console.warn("[AQICN] fetchAirQuality error:", err)
    return null
  }
}

export async function findNearestStation(_lat, _lng) {
  return null
}
