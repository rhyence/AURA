import { useEffect, useState } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

// ── Gauge constants ────────────────────────────────────────────────────────
const SIZE      = 240
const CX        = SIZE / 2       // 120
const CY        = SIZE / 2       // 120
const R         = 88
const C         = 2 * Math.PI * R  // full circumference ≈ 552.9

// 240° sweep: leaves a 120° gap at the bottom
const SWEEP_DEG = 240
const SWEEP     = (SWEEP_DEG / 360) * C   // arc length ≈ 368.6
const GAP       = C - SWEEP               // gap length ≈ 184.3

// Rotate so the arc starts at bottom-left (150° from 3 o'clock = rotate by 150°)
const ROTATION  = `rotate(150 ${CX} ${CY})`

// AQI max for scaling (WAQI/US AQI goes to 500)
const AQI_MAX   = 500

// ── Color stops for the arc fill ──────────────────────────────────────────
function getArcColor(aqi) {
  if (aqi <= 50)  return "#22c55e"   // green
  if (aqi <= 100) return "#eab308"   // yellow
  if (aqi <= 150) return "#f97316"   // orange
  if (aqi <= 200) return "#ef4444"   // red
  return                "#a855f7"    // purple
}

function getLabel(aqi) {
  if (aqi <= 50)  return "Good"
  if (aqi <= 100) return "Moderate"
  if (aqi <= 150) return "Unhealthy for Sensitive"
  if (aqi <= 200) return "Unhealthy"
  return                 "Hazardous"
}

export default function AQIGauge({ aqi }) {
  const safeAQI = Math.min(Math.max(Number(aqi) || 0, 0), AQI_MAX)

  // ── Animate number counter ───────────────────────────────────────────────
  const [displayAQI, setDisplayAQI] = useState(0)
  useEffect(() => {
    const controls = animate(0, safeAQI, {
      duration: 1.4,
      ease: [0.34, 1.56, 0.64, 1],   // spring-like overshoot
      onUpdate: (v) => setDisplayAQI(Math.round(v)),
    })
    return controls.stop
  }, [safeAQI])

  // ── Animate arc strokeDashoffset ─────────────────────────────────────────
  // dashoffset = SWEEP means 0% filled; 0 means 100% filled
  const targetOffset = SWEEP - (safeAQI / AQI_MAX) * SWEEP
  const dashOffset   = useMotionValue(SWEEP)

  useEffect(() => {
    const controls = animate(dashOffset, targetOffset, {
      duration: 1.4,
      ease: [0.34, 1.56, 0.64, 1],
    })
    return controls.stop
  }, [targetOffset])

  const color    = getArcColor(safeAQI)
  const label    = getLabel(safeAQI)

  return (
    <div className="flex flex-col items-center select-none">
      <div style={{ position: "relative", width: SIZE, height: SIZE * 0.7 }}>
        <svg width={SIZE} height={SIZE} style={{ position: "absolute", top: 0, left: 0 }}>

          {/* ── Track (background arc) ─────────────────────────────────── */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={14}
            strokeDasharray={`${SWEEP} ${GAP}`}
            strokeLinecap="round"
            transform={ROTATION}
          />

          {/* ── Value arc (animated) ───────────────────────────────────── */}
          <motion.circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${SWEEP} ${GAP}`}
            style={{ strokeDashoffset: dashOffset }}
            transform={ROTATION}
            // Subtle filter glow matching the arc color
            filter={`drop-shadow(0 0 8px ${color}88)`}
          />
        </svg>

        {/* ── Center text ────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, 0)",
            textAlign: "center",
          }}
        >
          <motion.p
            key={safeAQI}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
            style={{ fontSize: 48, fontWeight: 800, color, lineHeight: 1 }}
          >
            {displayAQI}
          </motion.p>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>US AQI</p>
        </div>
      </div>

      {/* Label below gauge */}
      <motion.p
        key={label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{ fontSize: 15, fontWeight: 600, color, marginTop: -10 }}
      >
        {label}
      </motion.p>
    </div>
  )
}