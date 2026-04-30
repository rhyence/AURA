import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import AnimatedPage from "../components/AnimatedPage"
import { staggerContainer, cardVariants, scrollReveal } from "../animations/variants"

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}

// Curated RSS feeds relevant to air quality + asthma + children's health
const FEEDS = [
  { label: "WHO Air Quality", url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.who.int/rss-feeds/news-english.xml", tag: "WHO" },
  { label: "Air Quality News", url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.airnow.gov/rss/news.xml", tag: "AirNow" },
]

// Fallback curated articles since external RSS may be blocked
const FALLBACK = [
  {
    title: "How PM2.5 Affects Children with Asthma",
    description: "Fine particulate matter smaller than 2.5 micrometers can penetrate deep into the lungs and trigger severe asthma attacks in children. Studies show even short-term exposure worsens symptoms.",
    link: "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health",
    source: "WHO", date: "2024",
    tag: "asthma",
  },
  {
    title: "AQI Safety Guide for Parents of Asthmatic Children",
    description: "When AQI exceeds 100, children with respiratory conditions should avoid outdoor activities. Learn what each AQI level means for your child's safety.",
    link: "https://www.airnow.gov/aqi/aqi-basics/",
    source: "AirNow", date: "2024",
    tag: "safety",
  },
  {
    title: "Indoor Air Quality Tips for Families",
    description: "On days with poor outdoor air quality, keeping windows closed and using air purifiers with HEPA filters can significantly reduce indoor pollutant levels.",
    link: "https://www.epa.gov/indoor-air-quality-iaq",
    source: "EPA", date: "2024",
    tag: "tips",
  },
  {
    title: "The Link Between Traffic Pollution and Childhood Asthma",
    description: "Children living near high-traffic roads are at greater risk of developing asthma. Nitrogen dioxide from vehicles is a key trigger for respiratory inflammation.",
    link: "https://www.who.int/news-room/fact-sheets/detail/asthma",
    source: "WHO", date: "2024",
    tag: "research",
  },
  {
    title: "Wildfire Smoke and Children's Health",
    description: "Wildfire smoke contains a mix of fine particles and toxic gases. Children should stay indoors with windows closed and wear N95 masks if outdoor exposure is unavoidable.",
    link: "https://www.cdc.gov/air/children.htm",
    source: "CDC", date: "2024",
    tag: "safety",
  },
  {
    title: "Signs Your Child's Asthma is Triggered by Air Pollution",
    description: "Watch for increased coughing, wheezing, shortness of breath, or chest tightness on high-AQI days. These are signs that outdoor air quality is affecting your child.",
    link: "https://www.lung.org/clean-air/outdoors/who-is-at-risk/children",
    source: "American Lung Association", date: "2024",
    tag: "asthma",
  },
  {
    title: "How to Create a Safe Indoor Environment on Smog Days",
    description: "Use air purifiers, avoid candles and incense, keep pets clean, and vacuum with HEPA filters. These steps can dramatically reduce indoor pollutant levels.",
    link: "https://www.epa.gov/indoor-air-quality-iaq/improving-indoor-air-quality",
    source: "EPA", date: "2024",
    tag: "tips",
  },
  {
    title: "Global Air Quality Report 2024",
    description: "The latest data shows 99% of the world's population breathes air exceeding WHO guidelines. Southeast Asia remains one of the most affected regions.",
    link: "https://www.iqair.com/world-air-quality-report",
    source: "IQAir", date: "2024",
    tag: "research",
  },
]

const TAG_COLORS = {
  asthma:   { bg: "rgba(255,60,60,0.1)",   text: "#ff3c3c" },
  safety:   { bg: "rgba(255,230,109,0.1)", text: "#ffe66d" },
  tips:     { bg: "rgba(78,205,196,0.1)",  text: "#4ecdc4" },
  research: { bg: "rgba(255,140,66,0.1)",  text: "#ff8c42" },
  WHO:      { bg: "rgba(78,205,196,0.1)",  text: "#4ecdc4" },
  AirNow:   { bg: "rgba(255,140,66,0.1)",  text: "#ff8c42" },
}

const FILTERS = ["all", "asthma", "safety", "tips", "research"]

export default function News() {
  const [filter, setFilter] = useState("all")
  const articles = filter === "all" ? FALLBACK : FALLBACK.filter(a => a.tag === filter)

  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", padding: "32px 16px 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <div>
            <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32,
                          color: "#fff", letterSpacing: "-0.02em" }}>
              Air News<span style={{ color: "#ff3c3c" }}>.</span>
            </h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4, fontFamily: "DM Mono, monospace" }}>
              guides & research for parents of asthmatic children
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <motion.button key={f} whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 11,
                  fontFamily: "DM Mono, monospace", letterSpacing: "0.08em",
                  textTransform: "uppercase", fontWeight: 600,
                  background: filter === f ? "#ff3c3c" : "rgba(28,28,28,0.8)",
                  color: filter === f ? "#fff" : "#555",
                  border: filter === f ? "1px solid #ff3c3c" : "1px solid rgba(255,255,255,0.06)",
                }}>
                {f}
              </motion.button>
            ))}
          </div>

          {/* Articles */}
          <motion.div variants={staggerContainer} initial="initial" animate="animate"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {articles.map((a, i) => {
              const tagStyle = TAG_COLORS[a.tag] || TAG_COLORS.tips
              return (
                <motion.a key={i} variants={cardVariants}
                  href={a.link} target="_blank" rel="noopener noreferrer"
                  whileHover={{ y: -3 }}
                  style={{ ...card, padding: 20, display: "block", textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{
                      padding: "2px 10px", borderRadius: 99, fontSize: 10,
                      fontFamily: "DM Mono, monospace", fontWeight: 600,
                      background: tagStyle.bg, color: tagStyle.text,
                    }}>{a.tag}</span>
                    <span style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace" }}>
                      {a.source} · {a.date}
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

        </div>
      </div>
    </AnimatedPage>
  )
}
