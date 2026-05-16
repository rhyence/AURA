import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { scrollReveal } from "../animations/variants"

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openaq-proxy`
const ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY

const card = {
  background:    "rgba(22,22,22,0.85)",
  border:        "1px solid rgba(255,255,255,0.07)",
  backdropFilter:"blur(20px)",
  borderRadius:  16,
}

function aqiColor(aqi) {
  if (aqi <= 50)  return "#4ecdc4"
  if (aqi <= 100) return "#ffe66d"
  if (aqi <= 150) return "#ff8c42"
  if (aqi <= 200) return "#ff3c3c"
  return "#c0392b"
}

function pm25ToAqi(c) {
  if (c == null) return null
  const BP = [
    [0.0,   9.0,   0,   50],
    [9.1,   35.4,  51,  100],
    [35.5,  55.4,  101, 150],
    [55.5,  125.4, 151, 200],
    [125.5, 225.4, 201, 300],
    [225.5, 325.4, 301, 500],
  ]
  for (const [cLo, cHi, aLo, aHi] of BP) {
    if (c >= cLo && c <= cHi)
      return Math.round(((aHi - aLo) / (cHi - cLo)) * (c - cLo) + aLo)
  }
  return null
}

async function findPm25SensorId(lat, lng) {
  // Nearest location within 25km, fresh within 24h, with pm25 sensor
  const res = await fetch(
    `${PROXY_BASE}?path=${encodeURIComponent(`/v3/locations?coordinates=${lat},${lng}&radius=25000&limit=10`)}`,
    { headers: { Authorization: `Bearer ${ANON_KEY}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  const locations = (data.results || []).filter(
    (l) =>
      l.datetimeLast &&
      Date.now() - new Date(l.datetimeLast.utc).getTime() < 24 * 3600 * 1000
  )
  const loc = locations.find((l) =>
    l.sensors?.some((s) => s.parameter?.name === "pm25")
  )
  if (!loc) return null
  const sensor = loc.sensors.find((s) => s.parameter?.name === "pm25")
  return sensor?.id ?? null
}

async function fetchLast24h(sensorId) {
  const now    = new Date()
  const past   = new Date(now.getTime() - 24 * 3600 * 1000)
  const toISO  = (d) => d.toISOString().replace(".000", "")
  const openaqPath =
    `/v3/sensors/${sensorId}/measurements` +
    `?period_name=hour&datetime_from=${toISO(past)}&datetime_to=${toISO(now)}&limit=24`
  const url = `${PROXY_BASE}?path=${encodeURIComponent(openaqPath)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.results || []
}

export default function AqiChart({ lat, lng }) {
  const [points,  setPoints]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!lat || !lng) { setLoading(false); return }

    let cancelled = false
    async function load() {
      try {
        const sensorId = await findPm25SensorId(lat, lng)
        if (!sensorId || cancelled) { setLoading(false); return }

        const measurements = await fetchLast24h(sensorId)
        if (cancelled) return

        const pts = measurements
          .map((m) => {
            const hour = new Date(m.period?.datetimeTo?.utc || m.datetime?.utc)
            const val  = m.value ?? m.average ?? null
            return { hour: hour.getHours(), aqi: pm25ToAqi(val), ts: hour.getTime() }
          })
          .filter((p) => p.aqi !== null)
          .sort((a, b) => a.ts - b.ts)

        setPoints(pts)
      } catch (e) {
        console.warn("[AqiChart] error:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [lat, lng])

  // Hide chart entirely if no data (never show model fallback)
  if (loading || points.length === 0) return null

  const max  = Math.max(...points.map((p) => p.aqi), 100)
  const now  = new Date().getHours()
  const W    = 600
  const H    = 120
  const PAD  = 8
  const barW = (W - PAD * 2) / points.length - 2

  return (
    <motion.div
      variants={scrollReveal} initial="initial" whileInView="whileInView"
      viewport={{ once: true }} style={{ ...card, padding: 24 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ color: "#aaa", fontSize: 11, fontFamily: "DM Mono, monospace",
                     letterSpacing: "0.12em", textTransform: "uppercase" }}>PM2.5 AQI — Last 24 Hours</h2>
        <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>ground sensor</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: "100%", minWidth: 300 }}>
          {points.map((p, i) => {
            const x       = PAD + i * ((W - PAD * 2) / points.length)
            const barH    = Math.max(4, (p.aqi / max) * H)
            const y       = H - barH
            const isCurr  = p.hour === now
            const color   = aqiColor(p.aqi)
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={barH}
                  fill={color} opacity={isCurr ? 1 : 0.45} rx={3} />
                {isCurr && (
                  <rect x={x - 1} y={y - 1} width={barW + 2} height={barH + 2}
                    fill="none" stroke={color} strokeWidth={1.5} rx={3} />
                )}
                {(p.hour % 6 === 0 || isCurr) && (
                  <text x={x + barW / 2} y={H + 18}
                    textAnchor="middle" fontSize={9}
                    fill={isCurr ? color : "#444"}
                    fontFamily="DM Mono, monospace">
                    {p.hour === 0 ? "12a" : p.hour < 12 ? `${p.hour}a` : p.hour === 12 ? "12p" : `${p.hour - 12}p`}
                  </text>
                )}
                {isCurr && (
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