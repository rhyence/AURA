// Air Quality Service — IQAir (AirVisual) via Supabase Edge Function proxy
//
// Calls go through the iqair-proxy Edge Function so the API key stays
// server-side and the api-airvisual.com hostname resolves from Supabase's
// network (avoids ERR_NAME_NOT_RESOLVED from client browsers).
//
// Normalized return shape:
//   { aqi, pm25, pm10, no2, so2, o3, co, time, source, stationName, forecasts_daily }

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON  = import.meta.env.VITE_SUPABASE_ANON_KEY
const PROXY_BASE     = `${SUPABASE_URL}/functions/v1/iqair-proxy`

// ── EPA PM2.5 → AQI breakpoints (exported for chart use) ─────────────────
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

// ── Normalize IQAir response into app's common shape ──────────────────────
function normalize(data) {
  if (!data) return null
  const pollution = data.current?.pollution
  if (!pollution) return null
  const aqi = pollution.aqius
  if (aqi == null || isNaN(Number(aqi))) return null

  // IQAir pollutant keys: p2=PM2.5, p1=PM10, o3=O3, n2=NO2, s2=SO2, co=CO
  const g = (key) => pollution[key]?.conc ?? null

  return {
    aqi:             Number(aqi),
    pm25:            g("p2"),
    pm10:            g("p1"),
    o3:              g("o3"),
    no2:             g("n2"),
    so2:             g("s2"),
    co:              g("co"),
    time:            pollution.ts ?? new Date().toISOString(),
    source:          "iqair",
    stationName:     [data.city, data.state, data.country].filter(Boolean).join(", "),
    forecasts_daily: data.forecasts_daily ?? [],
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/** Geo-based lookup — routed through iqair-proxy Edge Function */
export async function fetchAirQuality(lat, lng) {
  try {
    const path = encodeURIComponent(`/nearest_city?lat=${lat}&lon=${lng}`)
    const res = await fetch(`${PROXY_BASE}?path=${path}`, {
      headers: {
        "apikey":        SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`,
      },
    })
    if (!res.ok) throw new Error(`iqair-proxy ${res.status}`)
    const json = await res.json()
    if (json.status !== "success") throw new Error(`IQAir: ${json.data}`)
    return normalize(json.data)
  } catch (err) {
    console.warn("[IQAir] fetchAirQuality error:", err)
    return null
  }
}

/** No-op — IQAir free tier is geo-only */
export async function findNearestStation(_lat, _lng) {
  return null
}
