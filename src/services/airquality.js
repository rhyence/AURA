// Air Quality Service — AQICN (WAQI) city-feed via Supabase Edge Function proxy
//
// IQAir (api-airvisual.com) hostname is dead as of May 2026.
// AQICN geo endpoint returns wrong countries for PH coords.
// AQICN named city feed (/feed/<city>/) works reliably.
//
// Philippine station coverage reality (May 2026):
//   - Manila is the only reliably-live NCR station on AQICN.
//   - All other NCR city slugs (makati, quezon-city, etc.) return no data.
//   - NCR cities are mapped → "manila" directly to avoid a wasted round-trip.
//
// Strategy:
//   1. Reverse-geocode lat/lng → city name via Nominatim
//   2. Map known NCR cities → "manila" (single working station)
//   3. Call aqicn-proxy?path=/feed/<city>/
//   4. Fall back to "manila" if any other city returns no data
//
// Normalized return shape (same as IQAir era — no other files need changes):
//   { aqi, pm25, pm10, no2, so2, o3, co, time, source, stationName, forecasts_daily }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY
const PROXY_BASE   = `${SUPABASE_URL}/functions/v1/aqicn-proxy`
const AUTH         = { "Authorization": `Bearer ${ANON_KEY}` }

// ── NCR city → AQICN slug mapping ────────────────────────────────────────
// Only "manila" has a live station in NCR as of May 2026.
// All Metro Manila cities resolve here to avoid silent no-data round-trips.
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
    const a = json.address || {}
    return (a.city || a.town || a.municipality || a.county || "manila").toLowerCase()
  } catch {
    return "manila"
  }
}

// ── Resolve city name → best available AQICN slug ────────────────────────
function resolveSlug(city) {
  const lower = city.toLowerCase()
  return NCR_TO_SLUG[lower] ?? lower.replace(/\s+/g, "-")
}

// ── Call aqicn-proxy for a city slug ──────────────────────────────────────
async function fetchCity(slug) {
  const path = encodeURIComponent(`/feed/${slug}/`)
  const res  = await fetch(`${PROXY_BASE}?path=${path}`, { headers: AUTH })
  if (!res.ok) throw new Error(`aqicn-proxy ${res.status}`)
  return res.json()
}

// ── Normalize AQICN response into app's common shape ─────────────────────
function normalize(json) {
  if (!json || json.status !== "ok") return null
  const d   = json.data
  const aqi = Number(d?.aqi)
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

// ── Public API ────────────────────────────────────────────────────────────

export async function fetchAirQuality(lat, lng) {
  try {
    const city = await reverseGeocode(lat, lng)
    const slug = resolveSlug(city)
    console.log(`[AQICN] city="${city}" → slug="${slug}"`)

    let result = normalize(await fetchCity(slug))

    // Generic fallback for non-NCR locations with no AQICN station
    if (!result && slug !== "manila") {
      console.log(`[AQICN] no data for "${slug}", falling back to manila`)
      result = normalize(await fetchCity("manila"))
    }

    return result
  } catch (err) {
    console.warn("[AQICN] fetchAirQuality error:", err)
    return null
  }
}

/** No-op — kept for API compatibility with Home.jsx */
export async function findNearestStation(_lat, _lng) {
  return null
}
