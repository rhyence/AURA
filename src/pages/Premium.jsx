import { motion } from "framer-motion"
import AnimatedPage from "../components/AnimatedPage"
import { staggerContainer, cardVariants, buttonVariants, scrollReveal } from "../animations/variants"

const FREE_FEATURES = [
  { label: "Real-time AQI for 1 location",   check: true  },
  { label: "6 pollutant readings",            check: true  },
  { label: "1 child profile",                 check: true  },
  { label: "General daily tip",               check: true  },
  { label: "AQI refreshes every 5 hours",     check: true  },
  { label: "Multiple child profiles",         check: false },
  { label: "Personalized health tips",        check: false },
  { label: "Hourly AQI refresh",              check: false },
  { label: "AQI push notifications",          check: false },
  { label: "Priority support",                check: false },
]

const PREMIUM_FEATURES = [
  { icon: "📍", label: "Real-time AQI for 1 location",                              accent: "#4ecdc4" },
  { icon: "🌬️", label: "Full pollutant breakdown with health details",               accent: "#3c78ff" },
  { icon: "👨‍👩‍👧", label: "Unlimited child profiles",                                   accent: "#ffe66d" },
  { icon: "💡", label: "Personalized tips per child & condition",                    accent: "#ffe66d" },
  { icon: "⏱️", label: "Hourly AQI refresh (vs 5 hours on free)",                   accent: "#4ecdc4" },
  { icon: "🔔", label: "Push notifications when AQI becomes unhealthy or improves", accent: "#ff8c42" },
  { icon: "📊", label: "AQI trend history (coming soon)",                            accent: "#3c78ff" },
  { icon: "🎖️", label: "Priority customer support",                                  accent: "#ff3c3c" },
]

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}

export default function Premium() {
  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", padding: "32px 16px 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Hero */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            style={{ textAlign: "center", paddingTop: 16 }}>
            <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 40,
                         color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
              AURA<span style={{color:"#ff3c3c"}}>.</span> Premium
            </h1>
            <p style={{ color: "#555", fontSize: 14, fontFamily: "DM Mono, monospace", maxWidth: 320, margin: "0 auto" }}>
              everything your family needs to stay safe from air pollution
            </p>
          </motion.div>

          {/* Pricing card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{
              ...card,
              borderTop: "2px solid #ff3c3c",
              padding: 28, textAlign: "center",
            }}
          >
            <p style={{ fontSize: 11, color: "#555", fontFamily: "DM Mono, monospace",
                         letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              monthly plan
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 56, fontWeight: 800, color: "#fff", fontFamily: "Syne, sans-serif", lineHeight: 1 }}>₱99</span>
              <span style={{ fontSize: 16, color: "#444", marginBottom: 8, fontFamily: "DM Mono, monospace" }}>/mo</span>
            </div>
            <p style={{ fontSize: 11, color: "#444", fontFamily: "DM Mono, monospace", marginBottom: 4 }}>or ₱899/year · save 24%</p>
            <p style={{ fontSize: 11, color: "#333", fontFamily: "DM Mono, monospace", marginBottom: 24 }}>placeholder price — subject to change</p>

            <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
              style={{
                width: "100%", padding: "14px 0",
                background: "#ff3c3c", color: "#fff",
                borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
              }}
            >UPGRADE NOW · COMING SOON</motion.button>
          </motion.div>

          {/* Premium features */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            style={{ ...card, padding: 24 }}>
            <h2 style={{ fontSize: 11, color: "#aaa", fontFamily: "DM Mono, monospace",
                          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
              What you get
            </h2>
            <motion.div variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PREMIUM_FEATURES.map(f => (
                <motion.div key={f.label} variants={cardVariants}
                  style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 20, width: 28, flexShrink: 0, textAlign: "center" }}>{f.icon}</span>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: f.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#bbb" }}>{f.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Comparison table */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            style={{ ...card, padding: 24 }}>
            <h2 style={{ fontSize: 11, color: "#aaa", fontFamily: "DM Mono, monospace",
                          letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
              Free vs Premium
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px", gap: "0 8px", marginBottom: 12 }}>
              <div />
              <p style={{ fontSize: 10, color: "#444", textAlign: "center", fontFamily: "DM Mono, monospace" }}>FREE</p>
              <p style={{ fontSize: 10, color: "#ff3c3c", textAlign: "center", fontFamily: "DM Mono, monospace" }}>PREMIUM</p>
            </div>

            <motion.div variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true }}>
              {FREE_FEATURES.map((f, i) => (
                <motion.div key={f.label} variants={cardVariants}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 60px 70px", gap: "0 8px",
                    alignItems: "center", padding: "10px 0",
                    borderBottom: i < FREE_FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <p style={{ fontSize: 13, color: "#888" }}>{f.label}</p>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {f.check
                      ? <span style={{ color: "#4ecdc4", fontWeight: 700, fontSize: 14 }}>✓</span>
                      : <span style={{ color: "#333", fontSize: 16 }}>—</span>
                    }
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <span style={{ color: "#ff3c3c", fontWeight: 700, fontSize: 14 }}>✓</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}
            style={{ textAlign: "center", paddingBottom: 16 }}>
            <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
              style={{
                padding: "14px 40px",
                background: "linear-gradient(135deg, #ff3c3c, #ff8c42)",
                color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
              }}
            >⭐ GET PREMIUM · ₱99/MONTH</motion.button>
            <p style={{ fontSize: 11, color: "#333", fontFamily: "DM Mono, monospace", marginTop: 10 }}>
              cancel anytime · no commitments
            </p>
          </motion.div>

        </div>
      </div>
    </AnimatedPage>
  )
}