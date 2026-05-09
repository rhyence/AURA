// Air Quality Service
// Strategy:
//   Metro Manila (NCR) → OpenAQ v3 real sensor network (Clarity + Manila Observatory)
//   Everywhere else    → Open-Meteo CAMS model (no station required)
//
// fetchAirQuality() always returns a normalized object with a `source` field:
//   source: "openaq" | "openmeteo"

const OPENAQ_KEY     = import.meta.env.VITE_OPENAQ_API_KEY
const OPENMETEO_URL  = "https://air-quality-api.open-meteo.com/v1/air-quality"
const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL
const OPENAQ_PROXY   = `${SUPABASE_URL}/functions/v1/openaq-proxy`

function openaqUrl(path) {
  return `${OPENAQ_PROXY}?path=${encodeURIComponent(path)}`
}

// Bounding box for Metro Manila / NCR
const NCR_BOUNDS = { latMin: 14.35, latMax: 14.80, lngMin: 120.88, lngMax: 121.20 }

function isMetroManila(lat, lng) {
  return lat  >= NCR_BOUNDS.latMin && lat  <= NCR_BOUNDS.latMax
      && lng  >= NCR_BOUNDS.lngMin && lng  <= NCR_BOUNDS.lngMax
}

// ── EPA PM2.5 → AQI conversion ────────────────────────────────────────────
const PM25_BP = [
  [0.0,  9.0,   0,  50],
  [9.1,  35.4,  51, 100],
  [35.5, 55.4,  101, 150],
  [55.5, 125.4, 151, 200],
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

// ── OpenAQ: nearest active sensor within 10km ────────────────────────────
async function fetchFromOpenAQ(lat, lng) {
  try {
    // Find nearest location
    const locRes = await fetch(
      openaqUrl(`/v3/locations?coordinates=${lat},${lng}&radius=10000&limit=10`)
    )
    const locData = await locRes.json()
    const locations = locData.results?.filter(l =>
      l.datetimeLast && (Date.now() - new Date(l.datetimeLast.utc).getTime()) < 3 * 3600 * 1000
    )
    if (!locations?.length) return null

    // Pick closest with pm25
    const loc = locations.find(l => l.sensors?.some(s => s.parameter?.name === "pm25"))
    if (!loc) return null

    // Fetch latest measurement
    const measRes = await fetch(openaqUrl(`/v3/locations/${loc.id}/latest`))
    const measData = await measRes.json()
    const readings = measData.results || []

    const get = (name) => readings.find(r => r.parameter === name)?.value ?? null

    const pm25 = get("pm25")
    const pm10 = get("pm10")
    const no2  = get("no2")
    const so2  = get("so2")
    const o3   = get("o3")
    const co   = get("co")

    const aqi = pm25ToAqi(pm25)
    if (aqi === null) return null

    return {
      aqi,
      pm25,
      pm10,
      co,
      no2,
      so2,
      o3,
      time:         readings[0]?.datetime?.utc || new Date().toISOString(),
      source:       "openaq",
      stationName:  loc.name,
      stationDist:  Math.round(loc.distance),
    }
  } catch (err) {
    console.warn("[OpenAQ] fetch error:", err)
    return null
  }
}

// ── Open-Meteo CAMS fallback ──────────────────────────────────────────────
function getCurrentHourIndex(times) {
  const currentHour = new Date().toISOString().slice(0, 13)
  const idx = times.findIndex(t => t.startsWith(currentHour))
  return idx !== -1 ? idx : times.length - 1
}

async function fetchFromOpenMeteo(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude:      lat,
      longitude:     lng,
      hourly:        "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
      timezone:      "Asia/Manila",
      forecast_days: 1,
    })
    const res  = await fetch(`${OPENMETEO_URL}?${params}`)
    const data = await res.json()
    if (!data.hourly) throw new Error("No data")
    const idx = getCurrentHourIndex(data.hourly.time)
    return {
      aqi:    data.hourly.us_aqi[idx],
      pm25:   data.hourly.pm2_5[idx],
      pm10:   data.hourly.pm10[idx],
      co:     data.hourly.carbon_monoxide[idx],
      no2:    data.hourly.nitrogen_dioxide[idx],
      so2:    data.hourly.sulphur_dioxide[idx],
      o3:     data.hourly.ozone[idx],
      time:   data.hourly.time[idx],
      source: "openmeteo",
    }
  } catch (err) {
    console.error("[Open-Meteo] fetch error:", err)
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────
export async function fetchAirQuality(lat, lng) {
  if (isMetroManila(lat, lng) && OPENAQ_KEY) {
    const result = await fetchFromOpenAQ(lat, lng)
    if (result) return result
    // Fall through to Open-Meteo if OpenAQ fails or no nearby station
    console.warn("[AQ] OpenAQ had no result, falling back to Open-Meteo")
  }
  return fetchFromOpenMeteo(lat, lng)
}