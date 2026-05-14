import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { scrollReveal } from "../animations/variants"

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aqicn-proxy`
const ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY

const card = {
  background:     "rgba(22,22,22,0.85)",
  border:         "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius:   16,
}

function aqiColor(aqi) {
  if (aqi <= 50)  return "#4ecdc4"
  if (aqi <= 100) return "#ffe66d"
  if (aqi <= 150) return "#ff8c42"
  if (aqi <= 200) return "#ff3c3c"
  return "#c0392b"
}

async function fetchForecast(lat, lng) {
  const res = await fetch(
    `${PROXY_BASE}?path=${encodeURIComponent(`/feed/geo:${lat};${lng}/`)}`,
    { headers: { Authorization: `Bearer ${ANON_KEY}` } }
  )
  if (!res.ok) return null
  const json = await res.json()
  if (json.status !== "ok") return null
  return json.data?.forecast?.daily?.pm25 ?? null
}

export default function AqiChart({ lat, lng }) {
  const [points,  setPoints]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lat || !lng) { setLoading(false); return }
    let cancelled = false
    async function load() {
      try {
        const daily = await fetchForecast(lat, lng)
        if (!daily || cancelled) { setLoading(false); return }

        // daily is an array of { avg, min, max, day } where day is "YYYY-MM-DD"
        const pts = daily
          .map((d) => {
            const avg = d.avg ?? null
            if (avg === null) return null
            const date  = new Date(d.day + "T00:00:00")
            const label = date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
            return { label, aqi: avg, min: d.min ?? avg, max: d.max ?? avg }
          })
          .filter(Boolean)

        if (!cancelled) setPoints(pts)
      } catch (e) {
        console.warn("[AqiChart] error:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [lat, lng])

  if (loading || points.length === 0) return null

  const maxVal = Math.max(...points.map((p) => p.max), 100)
  const W    = 600
  const H    = 120
  const PAD  = 8
  const barW = Math.floor((W - PAD * 2) / points.length) - 3

  return (
    <motion.div
      variants={scrollReveal} initial="initial" whileInView="whileInView"
      viewport={{ once: true }} style={{ ...card, padding: 24 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ color: "#aaa", fontSize: 11, fontFamily: "DM Mono, monospace",
                     letterSpacing: "0.12em", textTransform: "uppercase" }}>PM2.5 Forecast</h2>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>AQICN forecast</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 36}`} style={{ width: "100%", minWidth: 260 }}>
          {points.map((p, i) => {
            const x      = PAD + i * ((W - PAD * 2) / points.length)
            const barH   = Math.max(4, (p.aqi / maxVal) * H)
            const y      = H - barH
            const color  = aqiColor(p.aqi)
            const isToday = i === 0
            return (
              <g key={i}>
                {/* Range bar (min–max) */}
                {p.max > p.min && (() => {
                  const maxH = Math.max(4, (p.max / maxVal) * H)
                  const minH = Math.max(2, (p.min / maxVal) * H)
                  return (
                    <rect x={x + barW * 0.3} y={H - maxH}
                      width={barW * 0.4} height={maxH - minH}
                      fill={color} opacity={0.18} rx={2} />
                  )
                })()}
                {/* Avg bar */}
                <rect x={x} y={y} width={barW} height={barH}
                  fill={color} opacity={isToday ? 1 : 0.5} rx={3} />
                {isToday && (
                  <rect x={x - 1} y={y - 1} width={barW + 2} height={barH + 2}
                    fill="none" stroke={color} strokeWidth={1.5} rx={3} />
                )}
                {/* AQI value above bar */}
                <text x={x + barW / 2} y={y - 5}
                  textAnchor="middle" fontSize={9} fontWeight={isToday ? "700" : "400"}
                  fill={isToday ? color : "#555"} fontFamily="DM Mono, monospace">
                  {Math.round(p.aqi)}
                </text>
                {/* Date label */}
                <text x={x + barW / 2} y={H + 20}
                  textAnchor="middle" fontSize={9}
                  fill={isToday ? color : "#444"}
                  fontFamily="DM Mono, monospace">
                  {isToday ? "today" : p.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        {[["#4ecdc4","Good"],["#ffe66d","Moderate"],["#ff8c42","Poor"],["#ff3c3c","Unhealthy"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>{l}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
