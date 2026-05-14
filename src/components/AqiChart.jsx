import { motion } from "framer-motion"
import { scrollReveal } from "../animations/variants"

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

// AqiChart now receives forecasts_daily directly from the parent (Home.jsx)
// instead of fetching it itself — data is already in the fetchAirQuality response.
export default function AqiChart({ forecasts }) {
  if (!forecasts || forecasts.length === 0) return null

  const points = forecasts
    .map((d) => {
      const aqi = d.aqius ?? null
      if (aqi == null) return null
      const date  = new Date(d.ts)
      const label = date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
      return { label, aqi: Number(aqi) }
    })
    .filter(Boolean)
    .slice(0, 7) // max 7 days

  if (points.length === 0) return null

  const maxVal = Math.max(...points.map((p) => p.aqi), 100)
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
                     letterSpacing: "0.12em", textTransform: "uppercase" }}>AQI Forecast</h2>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>7-day · IQAir</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 36}`} style={{ width: "100%", minWidth: 260 }}>
          {points.map((p, i) => {
            const x     = PAD + i * ((W - PAD * 2) / points.length)
            const barH  = Math.max(4, (p.aqi / maxVal) * H)
            const y     = H - barH
            const color = aqiColor(p.aqi)
            const isToday = i === 0
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={barH}
                  fill={color} opacity={isToday ? 1 : 0.5} rx={3} />
                {isToday && (
                  <rect x={x - 1} y={y - 1} width={barW + 2} height={barH + 2}
                    fill="none" stroke={color} strokeWidth={1.5} rx={3} />
                )}
                <text x={x + barW / 2} y={y - 5}
                  textAnchor="middle" fontSize={9} fontWeight={isToday ? "700" : "400"}
                  fill={isToday ? color : "#555"} fontFamily="DM Mono, monospace">
                  {Math.round(p.aqi)}
                </text>
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
