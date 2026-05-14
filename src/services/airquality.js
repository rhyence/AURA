// Air Quality Service — IQAir (AirVisual) direct from frontend
//
// IQAir community keys are low-risk to expose: 10k calls/month hard cap,
// no billing attached. No proxy needed.
//
// Normalized return shape:
//   { aqi, pm25, pm10, no2, so2, o3, co, time, source, stationName, forecasts_daily }

const IQAIR_BASE = "https://api-airvisual.com/v2"
const IQAIR_KEY  = import.meta.env.VITE_IQAIR_API_KEY

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

/** Geo-based lookup — used for map taps and home screen */
export async function fetchAirQuality(lat, lng) {
  try {
    const res = await fetch(
      `${IQAIR_BASE}/nearest_city?lat=${lat}&lon=${lng}&key=${IQAIR_KEY}`
    )
    if (!res.ok) throw new Error(`IQAir ${res.status}`)
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
