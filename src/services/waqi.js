const TOKEN = import.meta.env.VITE_WAQI_TOKEN

export async function fetchAQI(city = "here") {
  try {
    const res = await fetch(`https://api.waqi.info/feed/${city}/?token=${TOKEN}`)
    const json = await res.json()

    if (!json || json.status !== "ok") throw new Error(json?.data || "WAQI error")
    if (json.data.aqi === "-" || json.data.aqi == null) throw new Error("No current data")

    return json.data
  } catch (err) {
    console.error("WAQI fetch error:", err)
    return null
  }
}

// New function — fetch by coordinates
export async function fetchAQIByCoords(lat, lng) {
  return fetchAQI(`geo:${lat};${lng}`)
}