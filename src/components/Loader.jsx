import { useEffect, useState } from "react"

export default function Loader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const duration = 2200
    const frame = () => {
      const elapsed = Date.now() - start
      const p = Math.min(99, Math.floor((elapsed / duration) * 100))
      setProgress(p)
      if (p < 99) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [])

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0a0a", gap: 24, padding: 24,
    }}>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 36,
                   color: "#fff", letterSpacing: "-0.02em" }}>
        AURA<span style={{ color: "#ff3c3c" }}>.</span>
      </h1>

      <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10,
                         color: "#444", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            loading
          </span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 22,
                         color: "#ff3c3c", fontWeight: 700 }}>
            {progress}%
          </span>
        </div>
        <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, #ff3c3c, #ff8c42)",
            width: `${progress}%`,
            transition: "width 0.05s linear",
          }} />
        </div>
      </div>
    </div>
  )
}