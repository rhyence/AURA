import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { scrollReveal } from "../animations/variants"

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}

function aqiColor(aqi) {
  if (aqi <= 50)  return "#4ecdc4"
  if (aqi <= 100) return "#ffe66d"
  if (aqi <= 150) return "#ff8c42"
  if (aqi <= 200) return "#ff3c3c"
  return "#c0392b"
}

export default function AqiChart({ lat, lng }) {
  const [hourly, setHourly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lat || !lng) return
    const params = new URLSearchParams({
      latitude: lat, longitude: lng,
      hourly: "us_aqi", timezone: "Asia/Manila", forecast_days: "1",
    })
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`)
      .then(r => r.json())
      .then(d => {
        if (!d.hourly?.us_aqi) return
        const now = new Date().getHours()
        const points = d.hourly.time.map((t, i) => ({
          hour: new Date(t).getHours(),
          aqi: d.hourly.us_aqi[i] ?? 0,
        }))
        // Show all 24h, mark current
        setHourly(points)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lat, lng])

  if (loading) return null

  const max = Math.max(...hourly.map(p => p.aqi), 100)
  const now = new Date().getHours()
  const W = 600
  const H = 120
  const PAD = 8
  const barW = (W - PAD * 2) / 24 - 2

  return (
    <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
      style={{ ...card, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ color: "#aaa", fontSize: 11, fontFamily: "DM Mono, monospace",
                     letterSpacing: "0.12em", textTransform: "uppercase" }}>AQI Today</h2>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>24-hour forecast</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: "100%", minWidth: 300 }}>
          {hourly.map((p, i) => {
            const x = PAD + i * ((W - PAD * 2) / 24)
            const barH = Math.max(4, (p.aqi / max) * H)
            const y = H - barH
            const isCurrent = p.hour === now
            const color = aqiColor(p.aqi)
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={barH}
                  fill={color} opacity={isCurrent ? 1 : 0.45} rx={3} />
                {isCurrent && (
                  <rect x={x - 1} y={y - 1} width={barW + 2} height={barH + 2}
                    fill="none" stroke={color} strokeWidth={1.5} rx={3} />
                )}
                {(p.hour % 6 === 0 || isCurrent) && (
                  <text x={x + barW / 2} y={H + 18}
                    textAnchor="middle" fontSize={9}
                    fill={isCurrent ? color : "#444"}
                    fontFamily="DM Mono, monospace">
                    {p.hour === 0 ? "12a" : p.hour < 12 ? `${p.hour}a` : p.hour === 12 ? "12p" : `${p.hour - 12}p`}
                  </text>
                )}
                {isCurrent && (
                  <text x={x + barW / 2} y={y - 6}
                    textAnchor="middle" fontSize={10} fontWeight="700"
                    fill={color} fontFamily="DM Mono, monospace">{p.aqi}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        {[["#4ecdc4","Good"],["#ffe66d","Moderate"],["#ff8c42","Poor"],["#ff3c3c","Unhealthy"]].map(([c,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>{l}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
