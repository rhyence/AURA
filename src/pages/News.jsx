import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  all:      (loc) => `latest air quality news Philippines ${loc} 2025 2026`,
  asthma:   (loc) => `asthma children air pollution health Philippines ${loc}`,
  safety:   (loc) => `air quality safety health advisory Philippines ${loc}`,
  vog:      (loc) => `volcanic smog vog Taal Mayon eruption Philippines`,
  wildfire: (loc) => `wildfire smoke air quality Philippines ${loc}`,
  disaster: (loc) => `volcano eruption earthquake disaster Philippines ${loc}`,
}

const TAG_COLORS = {
  all:      { bg: "rgba(255,60,60,0.1)",   text: "#ff3c3c" },
  asthma:   { bg: "rgba(255,60,60,0.1)",   text: "#ff3c3c" },
  safety:   { bg: "rgba(255,230,109,0.1)", text: "#ffe66d" },
  vog:      { bg: "rgba(78,205,196,0.1)",  text: "#4ecdc4" },
  wildfire: { bg: "rgba(255,140,66,0.1)",  text: "#ff8c42" },
  disaster: { bg: "rgba(180,60,255,0.1)",  text: "#b43cff" },
}

const FILTERS = ["all", "asthma", "safety", "vog", "wildfire", "disaster"]

function timeAgo(dateStr) {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Premium gate ──────────────────────────────────────────────────────────────
function PremiumGate() {
  const navigate = useNavigate()
  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", padding: "0 24px 80px", gap: 28 }}>
        <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          style={{ width: 88, height: 88, borderRadius: 20,
                   background: "rgba(255,230,109,0.1)", border: "1px solid rgba(255,230,109,0.2)",
                   display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
          📰
        </motion.div>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", marginBottom: 8 }}>
            Local Air News<span style={{ color: "#ff3c3c" }}>.</span>
          </h2>
          <p style={{ color: "#555", fontSize: 14, lineHeight: 1.65 }}>
            Get air quality news tailored to your saved location. Available on Premium.
          </p>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ ...card, padding: 20, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            "News filtered by your saved AQI location",
            "Topics: general, asthma, safety, vog, wildfire",
            "Sourced fresh via AI web search in real time",
            "Updates every time you open the tab",
          ].map((f, i) => (
            <motion.div key={f} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#888" }}>
              <span style={{ color: "#ffe66d", fontWeight: 700 }}>✓</span> {f}
            </motion.div>
          ))}
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/premium")}
          style={{ padding: "14px 36px", background: "linear-gradient(135deg, #ff3c3c, #ff8c42)",
                   color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700,
                   fontFamily: "DM Mono, monospace", letterSpacing: "0.1em" }}>
          ⭐ UPGRADE TO PREMIUM
        </motion.button>
      </div>
    </AnimatedPage>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ ...card, padding: 20, overflow: "hidden", position: "relative" }}>
      <div style={{ height: 10, width: "30%", background: "#1a1a1a", borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 16, width: "85%", background: "#1a1a1a", borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 13, width: "100%", background: "#1a1a1a", borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 13, width: "70%",  background: "#1a1a1a", borderRadius: 4 }} />
      <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)" }} />
    </div>
  )
}

// ── Claude-powered news fetch ─────────────────────────────────────────────────
async function fetchNewsViaClaude(query) {
  const today = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: `You are a news aggregator for an air quality app in the Philippines. Today is ${today}.
Search for recent news articles matching the query and return a JSON array of up to 6 articles.
Each article must be a real article found via web search — do NOT invent articles.
Return ONLY a valid JSON array, no markdown, no explanation:
[{"title":"...","description":"...","url":"...","source":"...","publishedAt":"ISO date string or null"}]
Rules:
- Only include articles from the last 30 days if possible, otherwise last 90 days
- description should be 1-2 sentences summarizing the article
- url must be the real article URL from search results
- source is the publication name`,
      messages: [{ role: "user", content: `Search for: ${query}` }],
    }),
  })

  if (!response.ok) throw new Error(`API ${response.status}`)
  const data = await response.json()

  // Extract text from all content blocks (web search returns multiple blocks)
  const text = data.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("")

  // Parse the JSON array from the response
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("No JSON array in response")
  return JSON.parse(match[0])
}

// ── Main component ────────────────────────────────────────────────────────────
export default function News() {
  const { isPremium, loading: userLoading } = useUser()
  const [filter,   setFilter]   = useState("all")
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [locName,  setLocName]  = useState("Philippines")
  const cacheRef = useRef({})

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

    const cacheKey = `${filter}:${locName}`

    // Use cached result for this session if available
    if (cacheRef.current[cacheKey]) {
      setArticles(cacheRef.current[cacheKey])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const query = QUERIES[filter](locName)
    fetchNewsViaClaude(query)
      .then(items => {
        cacheRef.current[cacheKey] = items
        setArticles(items)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
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
                  cursor: "pointer",
                }}>{f}</motion.button>
            ))}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              <p style={{ textAlign: "center", color: "#333", fontSize: 11,
                           fontFamily: "DM Mono, monospace", letterSpacing: "0.06em" }}>
                SEARCHING LATEST NEWS…
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ ...card, padding: 24, borderLeft: "2px solid #ff3c3c" }}>
              <p style={{ color: "#ff3c3c", fontSize: 13, fontFamily: "DM Mono, monospace" }}>⚠ {error}</p>
              <p style={{ color: "#444", fontSize: 12, marginTop: 8, fontFamily: "DM Mono, monospace" }}>
                Try switching filters or refreshing the page.
              </p>
            </div>
          )}

          {/* Articles */}
          {!loading && !error && (
            <motion.div variants={staggerContainer} initial="initial" animate="animate"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {articles.length === 0 && (
                <div style={{ ...card, padding: 24, textAlign: "center" }}>
                  <p style={{ color: "#555", fontSize: 13, fontFamily: "DM Mono, monospace" }}>
                    No articles found for this topic.
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
                        {a.source} · {timeAgo(a.publishedAt)}
                      </span>
                    </div>
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
