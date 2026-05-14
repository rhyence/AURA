// Air Quality Service — AQICN (WAQI) city-feed via Supabase Edge Function proxy
//
// IQAir (api-airvisual.com) hostname is dead as of May 2026.
// AQICN geo endpoint returns wrong countries for PH coords.
// AQICN named city feed (/feed/<city>/) is confirmed working for Manila.
//
// Strategy:
//   1. Reverse-geocode lat/lng → city name via Nominatim (already used in Location.jsx)
//   2. Call aqicn-proxy?path=/feed/<city>/ for that city name
//   3. Fall back to "manila" if the city lookup returns no data
//
// Normalized return shape (unchanged — same as IQAir era):
//   { aqi, pm25, pm10, no2, so2, o3, co, time, source, stationName, forecasts_daily }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY
const PROXY_BASE   = `${SUPABASE_URL}/functions/v1/aqicn-proxy`

const AUTH = { "Authorization": `Bearer ${ANON_KEY}` }

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

// ── Reverse-geocode lat/lng → city name ───────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    )
    const json = await res.json()
    // Prefer city > town > municipality > county
    const a = json.address || {}
    return (a.city || a.town || a.municipality || a.county || "manila")
      .toLowerCase()
      .replace(/\s+/g, "-")   // "quezon city" → "quezon-city"
  } catch {
    return "manila"
  }
}

// ── Call aqicn-proxy for a city slug ──────────────────────────────────────
async function fetchCity(citySlug) {
  const path = encodeURIComponent(`/feed/${citySlug}/`)
  const res  = await fetch(`${PROXY_BASE}?path=${path}`, { headers: AUTH })
  if (!res.ok) throw new Error(`aqicn-proxy ${res.status}`)
  return res.json()
}

// ── Normalize AQICN response into app's common shape ─────────────────────
function normalize(json) {
  if (!json || json.status !== "ok") return null
  const d   = json.data
  const aqi = Number(d.aqi)
  if (!d || isNaN(aqi)) return null

  const g = (key) => d.iaqi?.[key]?.v ?? null

  // Build forecasts_daily from AQICN forecast.daily.pm25 avg as day AQI
  const raw_fc = d.forecast?.daily?.pm25 ?? d.forecast?.daily?.o3 ?? []
  const forecasts_daily = raw_fc.map(f => ({
    ts:    f.day,
    aqius: f.avg,
    min:   f.min,
    max:   f.max,
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
    stationName:     d.city?.name ?? "Philippines",
    forecasts_daily,
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/** Geo-based lookup: reverse-geocode → city feed, fallback to manila */
export async function fetchAirQuality(lat, lng) {
  try {
    const city = await reverseGeocode(lat, lng)
    console.log(`[AQICN] trying city: ${city}`)

    let json = await fetchCity(city)
    let result = normalize(json)

    // If city slug returned no data, fall back to plain "manila"
    if (!result && city !== "manila") {
      console.warn(`[AQICN] no data for "${city}", falling back to manila`)
      json   = await fetchCity("manila")
      result = normalize(json)
    }

    return result
  } catch (err) {
    console.warn("[AQICN] fetchAirQuality error:", err)
    return null
  }
}

/** No-op — AQICN free tier is city-name based */
export async function findNearestStation(_lat, _lng) {
  return null
}
