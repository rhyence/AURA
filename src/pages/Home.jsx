import React, { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import AQIGauge from "../components/AQIGauge"
import PollutantModal from "../components/PollutantModal"
import AnimatedPage from "../components/AnimatedPage"
import { fetchAirQuality } from "../services/airquality"
import { supabase } from "../services/supabaseclient"
import { staggerContainer, cardVariants, buttonVariants, scrollReveal } from "../animations/variants"
import { useUser } from "../context/UserContext"
import { fireNotification } from "../services/notifications"



function getStatus(aqi) {
  const n = Number(aqi)
  if (isNaN(n)) return { label: "Unknown",                 accent: "#888",     bg: "rgba(136,136,136,0.12)" }
  if (n <= 50)  return { label: "Good",                    accent: "#4ecdc4",  bg: "rgba(78,205,196,0.12)"  }
  if (n <= 100) return { label: "Moderate",                accent: "#ffe66d",  bg: "rgba(255,230,109,0.12)" }
  if (n <= 150) return { label: "Unhealthy for Sensitive", accent: "#ff8c42",  bg: "rgba(255,140,66,0.12)"  }
  if (n <= 200) return { label: "Unhealthy",               accent: "#ff3c3c",  bg: "rgba(255,60,60,0.12)"   }
  return               { label: "Hazardous",               accent: "#c026d3",  bg: "rgba(192,38,211,0.12)"  }
}

const POLLUTANTS = [
  { key: "pm25", label: "PM2.5", unit: "μg/m³", icon: "🫧", accent: "#ff3c3c" },
  { key: "pm10", label: "PM10",  unit: "μg/m³", icon: "🌫️", accent: "#ff8c42" },
  { key: "o3",   label: "O₃",   unit: "μg/m³", icon: "☀️", accent: "#ffe66d" },
  { key: "no2",  label: "NO₂",  unit: "μg/m³", icon: "🏭", accent: "#4ecdc4" },
  { key: "so2",  label: "SO₂",  unit: "μg/m³", icon: "🌋", accent: "#3c78ff" },
  { key: "co",   label: "CO",   unit: "μg/m³", icon: "💨", accent: "#c026d3" },
]

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}


function HomeLoader({ progress }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  background: "#0a0a0a", gap: 24, padding: 24 }}>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 36,
                   color: "#fff", letterSpacing: "-0.02em" }}>
        AURA<span style={{ color: "#ff3c3c" }}>.</span>
      </h1>
      <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10,
                         color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            loading
          </span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 22,
                         color: "#ff3c3c", fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
          <div style={{ height: "100%", borderRadius: 99,
                        background: "linear-gradient(90deg, #ff3c3c, #ff8c42)",
                        width: `${progress}%`, transition: "width 0.3s ease" }} />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { isPremium, displayName } = useUser()
  const REFRESH_INTERVAL = isPremium ? 60 * 60 * 1000 : 5 * 60 * 60 * 1000
  const [data,           setData]        = useState(null)
  const [error,          setError]       = useState(null)
  const [location,       setLocation]    = useState(null)
  const [loading,        setLoading]     = useState(true)
  const [modalPollutant, setModal]       = useState(null)
  const [generalTip,     setGeneralTip]  = useState(null)
  const [lastUpdated,    setLastUpdated] = useState(null)
  const [loadProgress,   setLoadProgress] = useState(0)

  const loadData = useCallback(async (loc) => {
    setLoading(true)
    setLoadProgress(20)
    const result = await fetchAirQuality(loc.lat, loc.lng)
    setLoadProgress(90)
    if (!result) { setError("Could not load air quality data."); setLoading(false); return }
    setLoadProgress(100)
    setTimeout(() => setLoading(false), 300)
    setData(result); setLastUpdated(new Date())
  }, [])

  const loadTip = useCallback(async () => {
    try {
      const { data: tips } = await supabase.from("general_tips").select("content").eq("active", true)
      if (tips?.length > 0) setGeneralTip(tips[Math.floor(Math.random() * tips.length)].content)
    } catch { /* optional */ }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("airaware_location")
    if (!saved) { setError("no_location"); setLoading(false); return }
    const loc = JSON.parse(saved)
    setLocation(loc)
    loadData(loc)
    loadTip()
    const interval = setInterval(() => loadData(loc), REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [loadData, loadTip])

  // ── AQI auto-notification ────────────────────────────────────────────────────
  useEffect(() => {
    if (!data || !displayName) return
    const aqi = Number(data.aqi)
    const name = displayName
    const now = Date.now()
    const todayKey = `aura_notif_day_${new Date().toDateString()}`
    const lastGoodKey = 'aura_notif_last_good_ts'
    const lastLevelKey = 'aura_notif_last_level'
    const FIVE_HOURS = 5 * 60 * 60 * 1000

    const level = aqi <= 50 ? 'good' : aqi <= 100 ? 'moderate' : aqi <= 150 ? 'poor' : aqi <= 200 ? 'unhealthy' : 'hazardous'
    const lastLevel = localStorage.getItem(lastLevelKey)
    const isBad = level === 'poor' || level === 'unhealthy' || level === 'hazardous'

    let shouldNotify = false

    if (isBad) {
      // Always notify when it turns bad/worse, but not if already notified for this same bad level today
      const badKey = `aura_notif_bad_${level}_${new Date().toDateString()}`
      if (!localStorage.getItem(badKey)) {
        shouldNotify = true
        localStorage.setItem(badKey, '1')
      }
    } else {
      // Good/moderate: once per day AND at most every 5 hours
      const lastTs = Number(localStorage.getItem(lastGoodKey) || 0)
      const notifiedToday = localStorage.getItem(todayKey)
      if (!notifiedToday && (now - lastTs >= FIVE_HOURS)) {
        shouldNotify = true
        localStorage.setItem(todayKey, '1')
        localStorage.setItem(lastGoodKey, String(now))
      }
    }

    // Also notify immediately if level just changed to something worse
    if (lastLevel && lastLevel !== level && isBad) shouldNotify = true
    localStorage.setItem(lastLevelKey, level)

    if (!shouldNotify) return

    let title, body
    if (aqi <= 50) {
      title = `Hey ${name}, the air is great today! 🌿`
      body  = `AQI is ${aqi} — perfect for outdoor activities. Enjoy the fresh air!`
    } else if (aqi <= 100) {
      title = `Hey ${name}, air quality is moderate today 🌤️`
      body  = `AQI is ${aqi} — sensitive individuals should limit prolonged outdoor exposure.`
    } else if (aqi <= 150) {
      title = `Hey ${name}, air quality is poor today ⚠️`
      body  = `AQI is ${aqi} — consider wearing a mask outdoors and keeping windows closed.`
    } else if (aqi <= 200) {
      title = `Hey ${name}, the air is unhealthy today 😷`
      body  = `AQI is ${aqi} — avoid outdoor activities and keep kids inside.`
    } else {
      title = `Hey ${name}, hazardous air quality! 🚨`
      body  = `AQI is ${aqi} — stay indoors, keep all windows shut, and use air purifiers if possible.`
    }

    fireNotification(title, body)
  }, [data, displayName])


  if (error === "no_location") return (
    <AnimatedPage>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}
          style={{ fontSize: 56 }}>📍</motion.div>
        <div className="text-center">
          <h2 className="font-display font-bold text-2xl text-white mb-2">No location set</h2>
          <p style={{ color: "#666", fontSize: 14 }}>Set your location so AURA can show real air quality for your area.</p>
        </div>
        <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
          onClick={() => navigate("/location")}
          style={{ padding: "12px 28px", background: "#ff3c3c", color: "#fff", borderRadius: 10,
                   fontSize: 13, fontWeight: 600, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}
        >SET LOCATION</motion.button>
      </div>
    </AnimatedPage>
  )

  if (loading && !data) return <HomeLoader progress={loadProgress} />

  if (error && !data) return (
    <AnimatedPage>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p style={{ color: "#555", fontSize: 13 }}>{error}</p>
        <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
          onClick={() => navigate("/location")}
          style={{ padding: "10px 22px", background: "#ff3c3c", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}
        >Change location</motion.button>
      </div>
    </AnimatedPage>
  )

  const aqi    = Number(data.aqi)
  const status = getStatus(aqi)
  const updatedStr = lastUpdated?.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })

  return (
    <AnimatedPage>
      <div className="relative min-h-screen pb-16 px-4 pt-8">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Header */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            className="mb-2">
            <h1 className="font-display font-extrabold text-4xl text-white tracking-tight">AURA<span style={{color:"#ff3c3c"}}>.</span></h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4, fontFamily: "DM Mono, monospace" }}>real-time air quality</p>
          </motion.div>

          {/* AQI Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ ...card, borderTop: `2px solid ${status.accent}`, padding: 24 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: "#aaa", fontSize: 11, fontFamily: "DM Mono, monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Air Quality Index
              </h2>
              <motion.span key={status.label} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                         background: status.bg, color: status.accent,
                         fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}
              >{status.label.toUpperCase()}</motion.span>
            </div>

            <div className="flex justify-center py-2">
              <AQIGauge aqi={aqi} />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={() => navigate("/location")}
                style={{ fontSize: 12, color: "#4ecdc4", fontFamily: "DM Mono, monospace" }}
              >📍 {location?.name || "Your location"}</motion.button>
              {updatedStr && (
                <p style={{ fontSize: 11, color: "#444", fontFamily: "DM Mono, monospace" }}>
                  {updatedStr}
                  {!isPremium && (
                    <span onClick={() => navigate("/premium")}
                      style={{ color: "#ff3c3c", marginLeft: 6, cursor: "pointer" }}>
                      · upgrade →
                    </span>
                  )}
                </p>
              )}
            </div>
          </motion.div>

          {/* Pollutants */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            style={{ ...card, padding: 24 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: "#aaa", fontSize: 11, fontFamily: "DM Mono, monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Pollutants
              </h2>
              <span style={{ fontSize: 11, color: "#444", fontFamily: "DM Mono, monospace" }}>tap for details</span>
            </div>
            <motion.div variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}
              className="grid grid-cols-2 gap-3">
              {POLLUTANTS.map(({ key, label, unit, icon, accent }) => (
                <motion.button key={key} variants={cardVariants}
                  whileHover={{ y: -3, borderColor: accent }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setModal(key)}
                  style={{
                    background: "rgba(28,28,28,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12, padding: "16px", textAlign: "left", transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: accent,
                                   fontFamily: "DM Mono, monospace", letterSpacing: "0.1em" }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: "#e8e8e8", fontFamily: "Syne, sans-serif" }}>
                    {data[key] != null ? Number(data[key]).toFixed(1) : "—"}
                  </p>
                  <p style={{ fontSize: 11, color: "#444", fontFamily: "DM Mono, monospace", marginTop: 2 }}>{unit}</p>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          {/* Daily Tip */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            style={{ ...card, borderLeft: "2px solid #ffe66d", padding: 24 }}
          >
            <div className="flex items-start gap-4">
              <span style={{ fontSize: 22, marginTop: 2 }}>💡</span>
              <div className="flex-1">
                <p style={{ fontSize: 10, fontWeight: 600, color: "#ffe66d", fontFamily: "DM Mono, monospace",
                             letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Daily Tip</p>
                <AnimatePresence mode="wait">
                  <motion.p key={generalTip}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ fontSize: 14, color: "#ccc", lineHeight: 1.65 }}
                  >
                    {generalTip || "Stay indoors and keep windows closed when AQI is above 100."}
                  </motion.p>
                </AnimatePresence>
                {!isPremium && (
                  <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                    onClick={() => navigate("/premium")}
                    style={{ marginTop: 12, fontSize: 11, fontWeight: 600, color: "#ff3c3c",
                             fontFamily: "DM Mono, monospace" }}
                  >⭐ Upgrade for personalized tips →</motion.button>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <AnimatePresence>
        {modalPollutant && (
          <PollutantModal pollutant={modalPollutant} value={data[modalPollutant]} onClose={() => setModal(null)} />
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}