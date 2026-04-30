import { motion, AnimatePresence } from "framer-motion"
import { backdropVariants, modalVariants } from "../animations/variants"

const POLLUTANT_INFO = {
  pm25: {
    fullName: "Fine Particulate Matter (PM2.5)", unit: "μg/m³", icon: "🫧", accent: "#ff3c3c",
    description: "Tiny particles less than 2.5 micrometers in diameter — about 30× smaller than a human hair. They penetrate deep into the lungs and can enter the bloodstream.",
    sources: "Vehicle exhaust, burning wood or waste, industrial emissions, and cooking smoke.",
    health: "Linked to asthma attacks, reduced lung function, heart disease, and premature death. Children and the elderly are most vulnerable.",
    who: "WHO guideline: 15 μg/m³ (annual mean)",
  },
  pm10: {
    fullName: "Coarse Particulate Matter (PM10)", unit: "μg/m³", icon: "🌫️", accent: "#ff8c42",
    description: "Particles less than 10 micrometers in diameter. Larger than PM2.5 but still inhalable into the airways and lungs.",
    sources: "Road dust, construction sites, agricultural activities, pollen, and mold spores.",
    health: "Can irritate the nose, throat, and airways. Triggers asthma and allergic rhinitis in sensitive individuals.",
    who: "WHO guideline: 45 μg/m³ (annual mean)",
  },
  o3: {
    fullName: "Ground-Level Ozone (O₃)", unit: "μg/m³", icon: "☀️", accent: "#ffe66d",
    description: "Not emitted directly — forms when sunlight reacts with nitrogen oxides (NOx) and volatile organic compounds (VOCs) in the atmosphere.",
    sources: "Vehicle emissions, industrial facilities, and chemical solvents reacting under sunlight.",
    health: "Causes chest pain, coughing, and throat irritation. Worsens asthma and reduces lung function even in healthy adults.",
    who: "WHO guideline: 100 μg/m³ (8-hour mean)",
  },
  no2: {
    fullName: "Nitrogen Dioxide (NO₂)", unit: "μg/m³", icon: "🏭", accent: "#4ecdc4",
    description: "A reddish-brown gas with a sharp, biting odor. Part of a family of highly reactive gases called nitrogen oxides (NOx).",
    sources: "Burning fuel in vehicles, power plants, industrial boilers, and household gas appliances.",
    health: "Inflames the airways, increases susceptibility to respiratory infections, and is a key contributor to asthma in children.",
    who: "WHO guideline: 25 μg/m³ (annual mean)",
  },
  so2: {
    fullName: "Sulfur Dioxide (SO₂)", unit: "μg/m³", icon: "🌋", accent: "#3c78ff",
    description: "A colorless gas with a strong, pungent smell. One of the most common air pollutants in areas near industrial facilities or volcanoes.",
    sources: "Burning coal and oil (power plants, factories), metal smelting, and volcanic eruptions.",
    health: "Irritates the respiratory tract, triggers asthma attacks, and contributes to acid rain and fine particle formation.",
    who: "WHO guideline: 40 μg/m³ (24-hour mean)",
  },
  co: {
    fullName: "Carbon Monoxide (CO)", unit: "μg/m³", icon: "💨", accent: "#c026d3",
    description: "An odorless, colorless gas produced by incomplete combustion. Known as the 'silent killer' because it cannot be detected by human senses.",
    sources: "Vehicle exhaust (especially older engines), burning charcoal, gas stoves, and generators used during power outages.",
    health: "Reduces oxygen delivery to the body's organs. High concentrations cause headaches, dizziness, and at extreme levels, death.",
    who: "WHO guideline: 4 mg/m³ (24-hour mean)",
  },
}

const card = {
  background: "rgba(22,22,22,0.95)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(24px)",
  borderRadius: 20,
}

export default function PollutantModal({ pollutant, value, onClose }) {
  const info = POLLUTANT_INFO[pollutant]
  if (!info) return null

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants} initial="initial" animate="animate" exit="exit"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 50,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: 16,
        }}
      >
        <motion.div
          variants={modalVariants} initial="initial" animate="animate" exit="exit"
          onClick={e => e.stopPropagation()}
          style={{
            ...card,
            borderTop: `2px solid ${info.accent}`,
            padding: 24,
            width: "100%",
            maxWidth: 440,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{info.icon}</span>
              <div>
                <p style={{
                  fontSize: 10, fontWeight: 600, color: info.accent,
                  fontFamily: "DM Mono, monospace", letterSpacing: "0.12em",
                  textTransform: "uppercase", marginBottom: 3,
                }}>{pollutant.toUpperCase()}</p>
                <h3 style={{
                  fontSize: 15, fontWeight: 700, color: "#e8e8e8",
                  fontFamily: "Syne, sans-serif", lineHeight: 1.2,
                }}>{info.fullName}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                color: "#555", fontSize: 18, lineHeight: 1,
                marginTop: 2, background: "none", flexShrink: 0,
                padding: "4px 6px", borderRadius: 6,
              }}
            >✕</button>
          </div>

          {/* Current reading */}
          {value != null && (
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${info.accent}22`,
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            }}>
              <p style={{ fontSize: 11, color: "#444", fontFamily: "DM Mono, monospace", marginBottom: 4 }}>
                Current reading
              </p>
              <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: info.accent }}>
                {Number(value).toFixed(1)}
                <span style={{ fontSize: 13, fontWeight: 400, color: "#555", marginLeft: 6, fontFamily: "DM Mono, monospace" }}>
                  {info.unit}
                </span>
              </p>
            </div>
          )}

          {/* Info sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, color: "#aaa", lineHeight: 1.65 }}>
            <p>{info.description}</p>

            <div>
              <p style={{
                fontSize: 10, fontWeight: 600, color: "#ffe66d",
                fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
                textTransform: "uppercase", marginBottom: 6,
              }}>📍 Sources</p>
              <p style={{ color: "#777" }}>{info.sources}</p>
            </div>

            <div>
              <p style={{
                fontSize: 10, fontWeight: 600, color: "#ffe66d",
                fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
                textTransform: "uppercase", marginBottom: 6,
              }}>🫁 Health Effects</p>
              <p style={{ color: "#777" }}>{info.health}</p>
            </div>

            <p style={{
              fontSize: 11, color: "#333",
              fontFamily: "DM Mono, monospace",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: 14, marginTop: 2,
            }}>{info.who}</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
