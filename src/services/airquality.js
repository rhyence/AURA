// Air Quality Service — AQICN (WAQI) via Supabase Edge Function proxy
//
// Strategy:
//   All locations → AQICN /feed/geo:{lat};{lng}/ via aqicn-proxy (token never in frontend)
//   fetchAirQuality(lat, lng)  → geo lookup, returns normalized object or null
//   fetchAirQualityByUid(uid)  → uid-based lookup for saved station dots
//   findNearestStation()       → no-op returning null (WAQI geo lookup handles proximity)
//
// Normalized return shape:
//   { aqi, pm25, pm10, no2, so2, o3, co, time, source, stationName, stationLat, stationLng, forecast }

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aqicn-proxy`
const ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── EPA PM2.5 → AQI breakpoints (kept for chart use, not applied to main fetch) ──
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

// ── Proxy fetch helper ────────────────────────────────────────────────────────
async function waqiFetch(path) {
  const res = await fetch(`${PROXY_BASE}?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`aqicn-proxy ${res.status}: ${text}`)
  }
  const json = await res.json()
  // WAQI wraps everything in { status, data }
  if (json.status !== "ok") throw new Error(`WAQI error: ${json.data ?? json.status}`)
  return json.data
}

// ── Normalize a WAQI data object into the app's common shape ─────────────────
function normalize(data) {
  if (!data || data === "Unknown station" || typeof data === "string") return null

  const aqi = Number(data.aqi)
  if (isNaN(aqi) || aqi < 0) return null

  const g = (key) => data.iaqi?.[key]?.v ?? null

  return {
    aqi,
    pm25:        g("pm25"),
    pm10:        g("pm10"),
    no2:         g("no2"),
    so2:         g("so2"),
    o3:          g("o3"),
    co:          g("co"),
    time:        data.time?.iso ?? new Date().toISOString(),
    source:      "aqicn",
    stationName: data.city?.name ?? "Unknown station",
    stationLat:  data.city?.geo?.[0] ?? null,
    stationLng:  data.city?.geo?.[1] ?? null,
    // Expose full forecast for AqiChart
    forecast:    data.forecast ?? null,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Geo-based lookup — used for arbitrary map taps and first load */
export async function fetchAirQuality(lat, lng) {
  try {
    const data = await waqiFetch(`/feed/geo:${lat};${lng}/`)
    return normalize(data)
  } catch (err) {
    console.warn("[AQICN] fetchAirQuality error:", err)
    return null
  }
}

/** UID-based lookup — used when user has a saved station uid */
export async function fetchAirQualityByUid(uid) {
  try {
    const data = await waqiFetch(`/feed/@${uid}/`)
    return normalize(data)
  } catch (err) {
    console.warn("[AQICN] fetchAirQualityByUid error:", err)
    return null
  }
}

/** No-op — WAQI geo lookup handles proximity automatically */
export async function findNearestStation(_lat, _lng) {
  return null
}
