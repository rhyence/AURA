import { useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "../services/supabaseclient"

const inp = { width:"100%", padding:"11px 14px", background:"rgba(28,28,28,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#e8e8e8", fontSize:13, outline:"none", fontFamily:"Inter,sans-serif", boxSizing:"border-box" }

export default function DisplayNamePrompt({ userId, userEmail, onDone }) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!name.trim()) { setError("Please enter a display name."); return }
    setSaving(true)
    // upsert so it works whether the row exists or not
    const { error: err } = await supabase.from("profiles").upsert({
      id: userId,
      email: userEmail,
      display_name: name.trim(),
      plan: "free",
    }, { onConflict: "id" })
    setSaving(false)
    if (err) { setError(err.message); console.error("[DisplayName] upsert error:", err) }
    else onDone(name.trim())
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <motion.div initial={{ opacity:0, scale:0.92, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
        style={{ background:"rgba(22,22,22,0.96)", border:"1px solid rgba(255,255,255,0.08)", borderTop:"2px solid #ff3c3c", borderRadius:20, padding:28, width:"100%", maxWidth:360 }}>
        <h2 style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:22, color:"#fff", marginBottom:6 }}>Welcome to Aura<span style={{color:"#ff3c3c"}}>.</span></h2>
        <p style={{ fontSize:12, color:"#555", fontFamily:"DM Mono,monospace", marginBottom:24 }}>Set a display name before we get started.</p>
        <p style={{ fontSize:10, color:"#444", fontFamily:"DM Mono,monospace", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Display Name</p>
        <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSave()}
          placeholder="e.g. Maria" style={{ ...inp, marginBottom: error ? 8 : 16 }} autoFocus />
        {error && <p style={{ fontSize:11, color:"#ff3c3c", fontFamily:"DM Mono,monospace", marginBottom:12 }}>{error}</p>}
        <button onClick={handleSave} disabled={saving}
          style={{ width:"100%", padding:"12px 0", background:"#ff3c3c", color:"#fff", borderRadius:10, fontSize:12, fontWeight:700, fontFamily:"DM Mono,monospace", letterSpacing:"0.1em", opacity:saving?0.5:1, cursor:saving?"not-allowed":"pointer" }}>
          {saving ? "SAVING…" : "LET'S GO →"}
        </button>
      </motion.div>
    </div>
  )
}
