// Air Quality Service — OpenAQ only, via Supabase Edge Function proxy
//
// Strategy:
//   All locations → OpenAQ v3 via openaq-proxy (no direct API calls, no API key in frontend)
//   No station found within 25 km → return null (no fabricated satellite data)
//
// fetchAirQuality() returns a normalized object or null.
//   { aqi, pm25, pm10, no2, so2, o3, co, time, source, stationName, stationDist }

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openaq-proxy`
const ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── EPA PM2.5 → AQI breakpoints ──────────────────────────────────────────
const PM25_BP = [
  [0.0,   9.0,   0,   50],
  [9.1,   35.4,  51,  100],
  [35.5,  55.4,  101, 150],
  [55.5,  125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
]

function pm25ToAqi(c) {
  if (c == null) return null
  for (const [cLo, cHi, aLo, aHi] of PM25_BP) {
    if (c >= cLo && c <= cHi)
      return Math.round(((aHi - aLo) / (cHi - cLo)) * (c - cLo) + aLo)
  }
  return null
}

// ── Proxy fetch helper ────────────────────────────────────────────────────
async function proxyFetch(path) {
  const res = await fetch(`${PROXY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Proxy ${res.status}: ${text}`)
  }
  return res.json()
}

// ── OpenAQ fetch via proxy ────────────────────────────────────────────────
async function fetchFromOpenAQ(lat, lng) {
  try {
    // 1. Nearest locations within 25 km, fresh within 24 h
    const locData = await proxyFetch(
      `/v3/locations?coordinates=${lat},${lng}&radius=25000&limit=10`
    )
    const locations = (locData.results || []).filter(
      (l) =>
        l.datetimeLast &&
        Date.now() - new Date(l.datetimeLast.utc).getTime() < 24 * 3600 * 1000
    )
    if (!locations.length) return null

    // 2. Pick closest location that has a pm25 sensor
    const loc = locations.find((l) =>
      l.sensors?.some((s) => s.parameter?.name === "pm25")
    )
    if (!loc) return null

    // 3. Build sensorId → parameter name map from loc.sensors
    //    /v3/locations/{id}/latest returns sensorsId (not parameter) on each reading;
    //    we resolve parameter names via this map.
    const sensorMap = {}
    for (const s of loc.sensors || []) {
      if (s.id != null && s.parameter?.name) {
        sensorMap[s.id] = s.parameter.name
      }
    }

    // 4. Fetch latest readings
    const measData = await proxyFetch(`/v3/locations/${loc.id}/latest`)
    const readings = measData.results || []

    // 5. Resolve values by parameter name via sensorMap
    const get = (name) => {
      const r = readings.find((r) => sensorMap[r.sensorsId] === name)
      return r?.value ?? null
    }

    const pm25 = get("pm25")
    const aqi  = pm25ToAqi(pm25)
    if (aqi === null) return null

    return {
      aqi,
      pm25,
      pm10:        get("pm10"),
      co:          get("co"),
      no2:         get("no2"),
      so2:         get("so2"),
      o3:          get("o3"),
      time:        readings[0]?.datetime?.utc || new Date().toISOString(),
      source:      "openaq",
      stationName: loc.name,
      stationDist: Math.round(loc.distance ?? 0),
    }
  } catch (err) {
    console.warn("[OpenAQ] fetch error:", err)
    return null
  }
}

// ── Nearest station within 100 km (for outside-coverage info message) ─────
export async function findNearestStation(lat, lng) {
  try {
    const locData = await proxyFetch(
      `/v3/locations?coordinates=${lat},${lng}&radius=100000&limit=3`
    )
    const first = (locData.results || [])[0]
    if (!first) return null
    return {
      name:   first.name,
      distKm: Math.round((first.distance ?? 0) / 1000),
    }
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────
export async function fetchAirQuality(lat, lng) {
  return fetchFromOpenAQ(lat, lng)
}