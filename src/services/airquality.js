// Open-Meteo Air Quality API — completely free, no API key required
// Docs: https://open-meteo.com/en/docs/air-quality-api
// Uses CAMS satellite/model data so it works for ANY coordinates in the Philippines,
// not just cities with physical monitoring stations.

const BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

// Finds the index in the hourly time array that matches the current hour
function getCurrentHourIndex(times) {
  const now = new Date()
  // Format: "2026-04-29T14" — matches the first 13 chars of each ISO time string
  const currentHour = now.toISOString().slice(0, 13)
  const idx = times.findIndex(t => t.startsWith(currentHour))
  // Fall back to the last available entry if current hour isn't found
  return idx !== -1 ? idx : times.length - 1
}

/**
 * Fetch air quality data for a given latitude and longitude.
 * Returns a normalized object, or null on failure.
 */
export async function fetchAirQuality(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude:     lat,
      longitude:    lng,
      hourly:       "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi",
      timezone:     "Asia/Manila",
      forecast_days: 1,
    })

    const res  = await fetch(`${BASE_URL}?${params}`)
    const data = await res.json()

    if (!data.hourly) throw new Error("No air quality data returned")

    const idx = getCurrentHourIndex(data.hourly.time)

    // Return a flat, normalized object — no more digging through iaqi[key]?.v
    return {
      aqi:  data.hourly.us_aqi[idx],
      pm25: data.hourly.pm2_5[idx],
      pm10: data.hourly.pm10[idx],
      co:   data.hourly.carbon_monoxide[idx],
      no2:  data.hourly.nitrogen_dioxide[idx],
      so2:  data.hourly.sulphur_dioxide[idx],
      o3:   data.hourly.ozone[idx],
      time: data.hourly.time[idx],
    }
  } catch (err) {
    console.error("Air quality fetch error:", err)
    return null
  }
}
