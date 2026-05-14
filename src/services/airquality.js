// Air Quality Service — IQAir (AirVisual) via Supabase Edge Function proxy
//
// Free Community tier endpoints used:
//   /nearest_city?lat=&lon=  → geo lookup, returns city-level AQI + pollutants + 7-day forecast
//
// Normalized return shape:
//   { aqi, pm25, pm10, no2, so2, o3, co, time, source, stationName, forecasts_daily }

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/iqair-proxy`
const ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY

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

// ── Proxy fetch helper ────────────────────────────────────────────────────
async function iqairFetch(path) {
  const res = await fetch(`${PROXY_BASE}?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`iqair-proxy ${res.status}: ${text}`)
  }
  const json = await res.json()
  if (json.status !== "success") {
    throw new Error(`IQAir error: ${json.data ?? json.status}`)
  }
  return json.data
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
    aqi:            Number(aqi),
    pm25:           g("p2"),
    pm10:           g("p1"),
    o3:             g("o3"),
    no2:            g("n2"),
    so2:            g("s2"),
    co:             g("co"),
    time:           pollution.ts ?? new Date().toISOString(),
    source:         "iqair",
    stationName:    [data.city, data.state, data.country].filter(Boolean).join(", "),
    forecasts_daily: data.forecasts_daily ?? [],
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/** Geo-based lookup — used for map taps and home screen */
export async function fetchAirQuality(lat, lng) {
  try {
    const data = await iqairFetch(`/nearest_city?lat=${lat}&lon=${lng}`)
    return normalize(data)
  } catch (err) {
    console.warn("[IQAir] fetchAirQuality error:", err)
    return null
  }
}

/** No-op — IQAir free tier is geo-only, no station ID lookup */
export async function findNearestStation(_lat, _lng) {
  return null
}
