import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import AnimatedPage from "../components/AnimatedPage"
import { useUser } from "../context/UserContext"
import { staggerContainer, cardVariants } from "../animations/variants"

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}

const QUERIES = {
  all:      (loc) => `air quality pollution ${loc}`,
  asthma:   (loc) => `asthma children air pollution ${loc}`,
  safety:   (loc) => `air quality safety health ${loc}`,
  vog:      (loc) => `volcanic smog vog ${loc}`,
  wildfire: (loc) => `wildfire smoke air quality ${loc}`,
}

const TAG_COLORS = {
  all:      { bg: "rgba(255,60,60,0.1)",   text: "#ff3c3c" },
  asthma:   { bg: "rgba(255,60,60,0.1)",   text: "#ff3c3c" },
  safety:   { bg: "rgba(255,230,109,0.1)", text: "#ffe66d" },
  vog:      { bg: "rgba(78,205,196,0.1)",  text: "#4ecdc4" },
  wildfire: { bg: "rgba(255,140,66,0.1)",  text: "#ff8c42" },
}

const FILTERS = ["all", "asthma", "safety", "vog", "wildfire"]

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Premium gate ─────────────────────────────────────────────────────────────
function PremiumGate() {
  const navigate = useNavigate()
  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
                     justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ ...card, padding: 36, maxWidth: 360, width: "100%", textAlign: "center",
                       borderTop: "2px solid #ffe66d" }}>
          <p style={{ fontSize: 32, marginBottom: 16 }}>🔒</p>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22,
                        color: "#fff", marginBottom: 8 }}>
            Premium Feature
          </h2>
          <p style={{ color: "#555", fontSize: 13, fontFamily: "DM Mono, monospace",
                       lineHeight: 1.6, marginBottom: 24 }}>
            Local air quality news tailored to your location is available on the Premium plan.
          </p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate("/premium")}
            style={{ width: "100%", padding: "12px 0", background: "#ffe66d", color: "#111",
                      borderRadius: 10, fontSize: 12, fontWeight: 700,
                      fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", cursor: "pointer" }}>
            UPGRADE TO PREMIUM →
          </motion.button>
        </div>
      </div>
    </AnimatedPage>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function News() {
  const { isPremium, loading: userLoading } = useUser()
  const [filter,   setFilter]   = useState("all")
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [locName,  setLocName]  = useState("Philippines")

  // Read saved location name from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("airaware_location")
      if (saved) {
        const { name } = JSON.parse(saved)
        if (name) setLocName(name)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!isPremium) return
    setLoading(true); setError(null)
    const q = encodeURIComponent(QUERIES[filter](locName))
    const rss = encodeURIComponent(`https://news.google.com/rss/search?q=${q}&hl=en-PH&gl=PH&ceid=PH:en`)
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rss}&api_key=&count=10`)
      .then(r => r.json())
      .then(d => {
        if (d.status !== "ok") throw new Error("Feed error")
        const articles = d.items.map(item => ({
          title: item.title,
          description: item.description?.replace(/<[^>]+>/g, "").slice(0, 200) || "",
          url: item.link,
          image: item.thumbnail || item.enclosure?.link || null,
          publishedAt: item.pubDate,
          source: { name: item.author || new URL(item.link).hostname.replace("www.", "") },
        }))
        setArticles(articles)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [filter, isPremium, locName])

  if (userLoading) return null
  if (!isPremium) return <PremiumGate />

  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", padding: "32px 16px 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          <div>
            <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32,
                          color: "#fff", letterSpacing: "-0.02em" }}>
              Air News<span style={{ color: "#ff3c3c" }}>.</span>
            </h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4, fontFamily: "DM Mono, monospace" }}>
              {locName} · latest air quality news
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 11,
                  fontFamily: "DM Mono, monospace", letterSpacing: "0.08em",
                  textTransform: "uppercase", fontWeight: 600,
                  background: filter === f ? "#ff3c3c" : "rgba(28,28,28,0.8)",
                  color: filter === f ? "#fff" : "#555",
                  border: filter === f ? "1px solid #ff3c3c" : "1px solid rgba(255,255,255,0.06)",
                }}>{f}</motion.button>
            ))}
          </div>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ ...card, padding: 20, opacity: 0.4 }}>
                  <div style={{ height: 10, width: "30%", background: "#222", borderRadius: 4, marginBottom: 12 }} />
                  <div style={{ height: 16, width: "80%", background: "#222", borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 12, width: "100%", background: "#222", borderRadius: 4 }} />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ ...card, padding: 24, borderLeft: "2px solid #ff3c3c" }}>
              <p style={{ color: "#ff3c3c", fontSize: 13, fontFamily: "DM Mono, monospace" }}>⚠ {error}</p>
            </div>
          )}

          {!loading && !error && (
            <motion.div variants={staggerContainer} initial="initial" animate="animate"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {articles.length === 0 && (
                <div style={{ ...card, padding: 24, textAlign: "center" }}>
                  <p style={{ color: "#555", fontSize: 13, fontFamily: "DM Mono, monospace" }}>
                    No articles found for this topic in your area.
                  </p>
                </div>
              )}
              {articles.map((a, i) => {
                const tagStyle = TAG_COLORS[filter]
                return (
                  <motion.a key={i} variants={cardVariants}
                    href={a.url} target="_blank" rel="noopener noreferrer"
                    whileHover={{ y: -3 }}
                    style={{ ...card, padding: 20, display: "block", textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10,
                                     fontFamily: "DM Mono, monospace", fontWeight: 600,
                                     background: tagStyle.bg, color: tagStyle.text }}>{filter}</span>
                      <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>
                        {a.source?.name} · {timeAgo(a.publishedAt)}
                      </span>
                    </div>
                    {a.image && (
                      <img src={a.image} alt="" onError={e => e.target.style.display="none"}
                        style={{ width: "100%", height: 160, objectFit: "cover",
                                 borderRadius: 10, marginBottom: 12 }} />
                    )}
                    <p style={{ color: "#e8e8e8", fontWeight: 700, fontSize: 15,
                                 lineHeight: 1.4, marginBottom: 8 }}>{a.title}</p>
                    <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>{a.description}</p>
                    <p style={{ fontSize: 11, color: "#ff3c3c", fontFamily: "DM Mono, monospace",
                                 marginTop: 10, letterSpacing: "0.06em" }}>READ MORE →</p>
                  </motion.a>
                )
              })}
            </motion.div>
          )}

        </div>
      </div>
    </AnimatedPage>
  )
}