import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap, useMapEvents } from "react-leaflet"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { fetchAirQuality } from "../services/airquality"
import { supabase } from "../services/supabaseclient"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, 13, { duration: 1.2 }) }, [target, map])
  return null
}
function ClickHandler({ onSelect }) {
  useMapEvents({ click(e) { onSelect(e.latlng) } })
  return null
}

function getStatus(aqi) {
  const n = Number(aqi)
  if (isNaN(n)) return { label: "Unknown",                 accent: "#888"    }
  if (n <= 50)  return { label: "Good",                    accent: "#4ecdc4" }
  if (n <= 100) return { label: "Moderate",                accent: "#ffe66d" }
  if (n <= 150) return { label: "Unhealthy for Sensitive", accent: "#ff8c42" }
  if (n <= 200) return { label: "Unhealthy",               accent: "#ff3c3c" }
  return               { label: "Hazardous",               accent: "#c026d3" }
}

function stationColor(datetimeLast) {
  if (!datetimeLast) return "#555"
  const ageHours = (Date.now() - new Date(datetimeLast.utc).getTime()) / 3600000
  if (ageHours < 3)  return "#4ecdc4"
  if (ageHours < 24) return "#ffe66d"
  return "#ff8c42"
}

async function fetchPHStations() {
  const key = import.meta.env.VITE_OPENAQ_API_KEY
  // Fetch PH stations using multiple Metro Manila + key city coordinates
  // since OpenAQ v3 dropped bbox and caps radius at 25km
  const centers = [
    [14.5995, 120.9842], // Manila
    [14.6760, 121.0437], // QC
    [10.3157, 123.8854], // Cebu
    [7.1907,  125.4553], // Davao
    [16.4023, 120.5960], // Baguio
    [14.8527, 120.8170], // Pampanga
    [14.0766, 121.3270], // Laguna
  ]
  const headers = key ? { "X-API-Key": key } : {}
  try {
    const results = await Promise.all(
      centers.map(([lat, lng]) =>
        fetch(`https://api.openaq.org/v3/locations?coordinates=${lat},${lng}&radius=25000&limit=50`, { headers })
          .then(r => r.json()).then(d => d.results || []).catch(() => [])
      )
    )
    const all = results.flat()
    // Deduplicate by id
    const seen = new Set()
    return all.filter(s => {
      if (!s.coordinates?.latitude || seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
  } catch { return [] }
}

const card = {
  background: "rgba(22,22,22,0.9)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}
const inp = {
  flex: 1, padding: "11px 16px",
  background: "rgba(28,28,28,0.9)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, color: "#e8e8e8", fontSize: 13,
  outline: "none", fontFamily: "Inter, sans-serif",
}

export default function Location() {
  const navigate = useNavigate()
  const [query,           setQuery]           = useState("")
  const [flyTo,           setFlyTo]           = useState(null)
  const [pin,             setPin]             = useState(null)
  const [placeName,       setPlaceName]       = useState("")
  const [searching,       setSearching]       = useState(false)
  const [mapStyle,        setMapStyle]        = useState("dark")
  const [locating,        setLocating]        = useState(false)
  const [error,           setError]           = useState(null)
  const [saved,           setSaved]           = useState(false)
  const [preview,         setPreview]         = useState(null)
  const [loadingAQI,      setLoadingAQI]      = useState(false)
  const [stations,        setStations]        = useState([])
  const [showStations,    setShowStations]    = useState(true)
  const [loadingStations, setLoadingStations] = useState(false)

  useEffect(() => {
    setLoadingStations(true)
    fetchPHStations().then(s => { setStations(s); setLoadingStations(false) })
  }, [])

  const resolvePin = async (latlng) => {
    setPin(latlng); setSaved(false); setPreview(null); setPlaceName("")
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      )
      const data = await res.json()
      setPlaceName(
        data.address?.city || data.address?.town ||
        data.address?.village || data.address?.county ||
        data.display_name || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`
      )
    } catch {
      setPlaceName(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`)
    }
    setLoadingAQI(true)
    const aqiData = await fetchAirQuality(latlng.lat, latlng.lng)
    setLoadingAQI(false)
    if (aqiData) setPreview(aqiData)
  }

  const handleMapClick = (latlng) => resolvePin(latlng)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true); setError(null); setSaved(false)
    try {
      const res     = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      )
      const results = await res.json()
      if (!results.length) { setError("Location not found."); return }
      const coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
      setFlyTo(coords); resolvePin(coords)
    } catch { setError("Search failed. Check your connection.") }
    finally { setSearching(false) }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported."); return }
    setLocating(true); setError(null); setSaved(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setFlyTo(coords); resolvePin(coords); setLocating(false)
      },
      (err) => {
        setLocating(false)
        if (err.code === 1) setError("Location access denied.")
        else setError("Could not get your location. Try again.")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleConfirm = async () => {
    if (!pin) return
    const loc = { lat: pin.lat, lng: pin.lng, name: placeName }
    localStorage.setItem("airaware_location", JSON.stringify(loc))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from("profiles").upsert({ id: user.id, last_location: loc }, { onConflict: "id" })
    setSaved(true)
    setTimeout(() => navigate("/"), 900)
  }

  const status = preview ? getStatus(preview.aqi) : null

  return (
    <div style={{ minHeight: "100vh", padding: "32px 16px 64px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32, color: "#fff", letterSpacing: "-0.02em" }}>
            Set Location<span style={{ color: "#ff3c3c" }}>.</span>
          </h1>
          <p style={{ color: "#555", fontSize: 13, marginTop: 4, fontFamily: "DM Mono, monospace" }}>
            search, tap the map, or use your current location
          </p>
        </motion.div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search city or address…" style={inp} />
          <button type="submit" disabled={searching}
            style={{ padding: "11px 18px", background: "#ff3c3c", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em", opacity: searching ? 0.5 : 1, cursor: searching ? "not-allowed" : "pointer", flexShrink: 0 }}
          >{searching ? "…" : "SEARCH"}</button>
        </form>

        <motion.button whileHover={{ borderColor: "#4ecdc4" }} whileTap={{ scale: 0.98 }} onClick={handleUseCurrentLocation} disabled={locating}
          style={{ width: "100%", padding: "11px 16px", marginBottom: 16, background: "rgba(78,205,196,0.06)", border: "1px solid rgba(78,205,196,0.2)", borderRadius: 10, cursor: locating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "border-color 0.2s", opacity: locating ? 0.6 : 1 }}
        >
          {locating
            ? <div style={{ width: 14, height: 14, border: "2px solid #4ecdc4", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            : <span style={{ fontSize: 15 }}>📍</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: "#4ecdc4", fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>
            {locating ? "GETTING LOCATION…" : "USE CURRENT LOCATION"}
          </span>
        </motion.button>

        {error && <p style={{ color: "#ff3c3c", fontSize: 12, fontFamily: "DM Mono, monospace", marginBottom: 12 }}>{error}</p>}

        {/* Map toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => setShowStations(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: "DM Mono, monospace", cursor: "pointer", transition: "all 0.2s", background: showStations ? "rgba(78,205,196,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${showStations ? "rgba(78,205,196,0.35)" : "rgba(255,255,255,0.08)"}`, color: showStations ? "#4ecdc4" : "#555" }}
          >
            <span style={{ fontSize: 8 }}>●</span>
            {loadingStations ? "LOADING…" : showStations ? `${stations.length} STATIONS` : "SHOW STATIONS"}
          </button>

          {showStations && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {[["#4ecdc4", "< 3h"], ["#ffe66d", "Today"], ["#ff8c42", "Older"]].map(([color, label]) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "DM Mono, monospace", color: "#555" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 3, gap: 3 }}>
            {[["dark", "🌑 Dark"], ["color", "🗺️ Color"]].map(([val, label]) => (
              <button key={val} onClick={() => setMapStyle(val)}
                style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600, fontFamily: "DM Mono, monospace", cursor: "pointer", transition: "all 0.2s", background: mapStyle === val ? "#ff3c3c" : "transparent", color: mapStyle === val ? "#fff" : "#555" }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 8 }}>
          <MapContainer key={mapStyle} center={[12.8797, 121.774]} zoom={6} style={{ height: 360, width: "100%" }}>
            {mapStyle === "dark" ? (
              <TileLayer attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={19} />
            ) : (
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" subdomains="abc" maxZoom={19} />
            )}
            {flyTo && <FlyTo target={flyTo} />}
            <ClickHandler onSelect={handleMapClick} />
            {pin && <Marker position={pin} />}

            {showStations && stations.map(s => {
              const color = stationColor(s.datetimeLast)
              const params = (s.sensors ?? []).map(x => x.parameter?.name).filter(Boolean)
              const lastSeen = s.datetimeLast
                ? new Date(s.datetimeLast.utc).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "Unknown"
              return (
                <CircleMarker key={s.id} center={[s.coordinates.latitude, s.coordinates.longitude]} radius={5}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1.5 }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, lineHeight: 1.7, minWidth: 140 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{s.name}</div>
                      {params.length > 0 && <div style={{ color: "#999" }}>{params.join(", ")}</div>}
                      <div style={{ color: "#777", fontSize: 10, marginTop: 2 }}>Last: {lastSeen}</div>
                      <div style={{ color, fontSize: 10 }}>{s.isMonitor ? "✓ Reference monitor" : "◦ Low-cost sensor"}</div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>

        <p style={{ fontSize: 11, color: "#333", fontFamily: "DM Mono, monospace", textAlign: "center", marginBottom: 16 }}>
          tap the map to pin a location · dots = active OpenAQ stations
        </p>

        {pin && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: 20, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Selected</p>
                <p style={{ fontSize: 13, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  📍 {placeName || `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`}
                </p>
              </div>
              <button onClick={handleConfirm} disabled={saved}
                style={{ flexShrink: 0, padding: "10px 20px", background: saved ? "#4ecdc4" : "#ff3c3c", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em", cursor: saved ? "default" : "pointer" }}
              >{saved ? "✓ SAVED" : "CONFIRM"}</button>
            </div>

            {loadingAQI && <p style={{ fontSize: 12, color: "#444", fontFamily: "DM Mono, monospace", textAlign: "center" }}>fetching AQI preview…</p>}

            {preview && status && (
              <div style={{ padding: 16, borderRadius: 12, background: `${status.accent}0d`, border: `1px solid ${status.accent}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 10, color: "#555", fontFamily: "DM Mono, monospace", marginBottom: 4 }}>CURRENT AQI</p>
                  <p style={{ fontSize: 36, fontWeight: 800, color: status.accent, fontFamily: "Syne, sans-serif" }}>{preview.aqi}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: status.accent, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>{status.label.toUpperCase()}</span>
                  {preview.source && (
                    <p style={{ fontSize: 10, color: "#555", fontFamily: "DM Mono, monospace", marginTop: 4 }}>
                      via {preview.source === "openaq" ? "OpenAQ" : "Open-Meteo"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .leaflet-tooltip { background: rgba(14,14,14,0.97) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #e8e8e8 !important; box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important; border-radius: 8px !important; padding: 8px 10px !important; }
        .leaflet-tooltip-top::before { border-top-color: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  )
}