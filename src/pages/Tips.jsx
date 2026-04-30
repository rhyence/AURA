import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import AnimatedPage from "../components/AnimatedPage"
import { supabase } from "../services/supabaseclient"
import { staggerContainer, cardVariants, buttonVariants } from "../animations/variants"
import { useUser } from "../context/UserContext"

const AQI_LEVEL_LABELS = {
  good:      { label: "Good (0–50)",        accent: "#4ecdc4" },
  moderate:  { label: "Moderate (51–100)",   accent: "#ffe66d" },
  unhealthy: { label: "Unhealthy (101–200)", accent: "#ff8c42" },
  hazardous: { label: "Hazardous (200+)",    accent: "#ff3c3c" },
}

const DISEASE_LABELS = {
  asthma:           { label: "Asthma",          icon: "🫁" },
  allergic_rhinitis:{ label: "Allergic Rhinitis",icon: "🤧" },
  copd:             { label: "COPD",             icon: "💨" },
  eczema:           { label: "Eczema",           icon: "🩹" },
  cardiovascular:   { label: "Heart Condition",  icon: "❤️" },
}

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}

export default function Tips() {
  const navigate    = useNavigate()
  const { isPremium } = useUser()
  const [tips,      setTips]     = useState([])
  const [loading,   setLoading]  = useState(true)
  const [activeTab, setActiveTab]= useState(null)
  const [children,  setChildren] = useState([])

  useEffect(() => {
    if (!isPremium) return
    const load = async () => {
      setLoading(true)
      const { data: kids } = await supabase.from("children").select("*")
      if (kids?.length) { setChildren(kids); setActiveTab(kids[0].condition) }
      const { data: allTips } = await supabase.from("tips").select("*").order("aqi_level", { ascending: true })
      setTips(allTips || [])
      setLoading(false)
    }
    load()
  }, [isPremium])

  // Free locked screen
  if (!isPremium) {
    return (
      <AnimatedPage>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
                       alignItems: "center", justifyContent: "center", padding: "0 24px 80px", gap: 28 }}>

          <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            style={{
              width: 88, height: 88, borderRadius: 20,
              background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44,
            }}>🔒</motion.div>

          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", marginBottom: 8 }}>
              Personalized Tips<span style={{color:"#ff3c3c"}}>.</span>
            </h2>
            <p style={{ color: "#555", fontSize: 14, lineHeight: 1.65 }}>
              Get tips tailored to your child's condition and the current air quality. Available on Premium.
            </p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ ...card, padding: 20, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              "Tips based on your child's specific condition",
              "Updated as air quality changes",
              "Separate tabs for each child profile",
              "Organized by AQI severity level",
            ].map((f, i) => (
              <motion.div key={f} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#888" }}>
                <span style={{ color: "#4ecdc4", fontWeight: 700 }}>✓</span> {f}
              </motion.div>
            ))}
          </motion.div>

          <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
            onClick={() => navigate("/premium")}
            style={{
              padding: "14px 36px",
              background: "linear-gradient(135deg, #ff3c3c, #ff8c42)",
              color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700,
              fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
            }}
          >⭐ UPGRADE TO PREMIUM</motion.button>
        </div>
      </AnimatedPage>
    )
  }

  // Premium view
  const filteredTips = tips.filter(t => t.disease === activeTab)

  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", padding: "32px 16px 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32, color: "#fff", letterSpacing: "-0.02em" }}>
              Tips<span style={{color:"#ff3c3c"}}>.</span>
            </h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4, fontFamily: "DM Mono, monospace" }}>
              based on your child's condition & current air quality
            </p>
          </div>

          {/* Disclaimer */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ ...card, borderLeft: "2px solid #ffe66d", padding: 16, display: "flex", gap: 12 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 12, color: "#888", lineHeight: 1.65 }}>
              <strong style={{ color: "#ffe66d" }}>General wellness tips, not medical advice.</strong>{" "}
              Consult a healthcare professional if your child shows symptoms.
            </p>
          </motion.div>

          {/* Child tabs */}
          {children.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {children.map(child => {
                const d = DISEASE_LABELS[child.condition]
                const active = activeTab === child.condition
                return (
                  <motion.button key={child.id} whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab(child.condition)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                      borderRadius: 10, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                      fontFamily: "DM Mono, monospace", letterSpacing: "0.06em",
                      background: active ? "#ff3c3c" : "rgba(28,28,28,0.8)",
                      border: active ? "1px solid #ff3c3c" : "1px solid rgba(255,255,255,0.07)",
                      color: active ? "#fff" : "#666",
                    }}
                  ><span>{d?.icon}</span> {child.name}</motion.button>
                )
              })}
            </div>
          )}

          {/* Tips by level */}
          {loading ? (
            <p style={{ color: "#444", fontSize: 12, textAlign: "center", padding: "40px 0",
                         fontFamily: "DM Mono, monospace" }}>loading tips…</p>
          ) : filteredTips.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: "center" }}>
              <p style={{ color: "#555", fontSize: 13 }}>No tips available for this condition yet.</p>
            </div>
          ) : (
            Object.entries(AQI_LEVEL_LABELS).map(([level, { label, accent }]) => {
              const levelTips = filteredTips.filter(t => t.aqi_level === level)
              if (!levelTips.length) return null
              return (
                <motion.div key={level} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  style={{ ...card, borderTop: `2px solid ${accent}`, padding: 20 }}>
                  <p style={{ fontSize: 10, color: accent, fontFamily: "DM Mono, monospace",
                               letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>{label}</p>
                  <motion.div variants={staggerContainer} initial="initial" animate="animate"
                    style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {levelTips.map(tip => (
                      <motion.div key={tip.id} variants={cardVariants}
                        style={{ display: "flex", gap: 12, padding: "12px", borderRadius: 10,
                                 background: "rgba(28,28,28,0.6)" }}>
                        <span style={{ color: accent, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>›</span>
                        <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>{tip.content}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </AnimatedPage>
  )
}