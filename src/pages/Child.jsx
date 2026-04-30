import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import AnimatedPage from "../components/AnimatedPage"
import { supabase } from "../services/supabaseclient"
import { staggerContainer, cardVariants, buttonVariants, backdropVariants, modalVariants } from "../animations/variants"
import { useUser } from "../context/UserContext"

const DISEASES = [
  { value: "asthma",           label: "Asthma",                  icon: "🫁", note: "PM2.5 and ozone are major triggers for asthma attacks."                       },
  { value: "allergic_rhinitis",label: "Allergic Rhinitis",        icon: "🤧", note: "PM10 and pollen worsened by air pollution aggravate nasal allergies."          },
  { value: "copd",             label: "COPD / Chronic Bronchitis",icon: "💨", note: "Long-term exposure to PM2.5 accelerates COPD progression."                    },
  { value: "eczema",           label: "Eczema / Atopic Dermatitis",icon: "🩹",note: "NO₂ and particulate matter have been linked to eczema flare-ups."             },
  { value: "cardiovascular",   label: "Heart Condition",          icon: "❤️", note: "Air pollutants increase cardiovascular risk even in children."                 },
]

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}
const inp = {
  width: "100%", padding: "10px 16px",
  background: "rgba(28,28,28,0.9)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, color: "#e8e8e8", fontSize: 13, outline: "none",
  fontFamily: "Inter, sans-serif", boxSizing: "border-box",
}

export default function Child() {
  const { isPremium } = useUser()
  const [children,   setChildren]  = useState([])
  const [showForm,   setShowForm]  = useState(false)
  const [loading,    setLoading]   = useState(true)
  const [saving,     setSaving]    = useState(false)
  const [name,       setName]      = useState("")
  const [age,        setAge]       = useState("")
  const [conditions, setConditions] = useState(["asthma"])

  useEffect(() => {
    async function loadChildren() {
      const { data } = await supabase.from("children").select("*").order("created_at", { ascending: true })
      setChildren(data || [])
      setLoading(false)
    }
    loadChildren()
  }, [])

  const toggleCondition = (val) => {
    setConditions(prev =>
      prev.includes(val)
        ? prev.length === 1 ? prev  // must keep at least one
        : prev.filter(c => c !== val)
        : [...prev, val]
    )
  }

  const handleAdd = async () => {
    if (!name.trim() || !age) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newChild, error } = await supabase.from("children").insert([
      { name: name.trim(), age: Number(age), condition: conditions[0], conditions, user_id: user.id }
    ]).select().single()
    setSaving(false)
    if (!error && newChild) {
      setChildren(prev => [...prev, newChild])
      setName(""); setAge(""); setConditions(["asthma"]); setShowForm(false)
    }
  }

  const handleDelete = async (id) => {
    await supabase.from("children").delete().eq("id", id)
    setChildren(prev => prev.filter(c => c.id !== id))
  }

  const canAdd = isPremium || children.length === 0

  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", padding: "32px 16px 80px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32,
                            color: "#fff", letterSpacing: "-0.02em" }}>
                Children<span style={{color:"#ff3c3c"}}>.</span>
              </h1>
              <p style={{ color: "#555", fontSize: 13, marginTop: 4, fontFamily: "DM Mono, monospace" }}>
                {isPremium ? "manage all child profiles" : "free plan · 1 child profile"}
              </p>
            </div>
            {canAdd && (
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={() => setShowForm(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 18px", background: "#ff3c3c", color: "#fff",
                  borderRadius: 10, fontSize: 12, fontWeight: 600,
                  fontFamily: "DM Mono, monospace", letterSpacing: "0.08em",
                }}>＋ ADD CHILD</motion.button>
            )}
          </div>

          {/* Empty state */}
          {!loading && children.length === 0 && !showForm && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ ...card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👧</div>
              <p style={{ color: "#888", fontWeight: 600, fontSize: 14, marginBottom: 6 }}>No child profiles yet</p>
              <p style={{ color: "#444", fontSize: 13, marginBottom: 20 }}>
                Add your child's profile to get personalized air quality tips.
              </p>
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={() => setShowForm(true)}
                style={{ padding: "10px 24px", background: "#ff3c3c", color: "#fff",
                         borderRadius: 10, fontSize: 12, fontWeight: 600,
                         fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>ADD FIRST CHILD</motion.button>
            </motion.div>
          )}

          {/* Children list */}
          {children.length > 0 && (
            <motion.div variants={staggerContainer} initial="initial" animate="animate"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {children.map(child => {
                const childConditions = child.conditions || [child.condition]
                const diseases = childConditions.map(c => DISEASES.find(d => d.value === c)).filter(Boolean)
                return (
                  <motion.div key={child.id} variants={cardVariants}
                    whileHover={{ y: -3 }}
                    style={{ ...card, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                      }}>{diseases[0]?.icon || "👦"}</div>
                      <div>
                        <p style={{ color: "#e8e8e8", fontWeight: 600, fontSize: 14 }}>{child.name}</p>
                        <p style={{ color: "#555", fontSize: 12, fontFamily: "DM Mono, monospace", marginTop: 2 }}>Age {child.age}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                          {diseases.map(d => (
                            <span key={d.value} style={{
                              display: "inline-block", padding: "2px 8px",
                              background: "rgba(78,205,196,0.1)", color: "#4ecdc4",
                              borderRadius: 99, fontSize: 10, fontFamily: "DM Mono, monospace",
                            }}>{d.label}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(child.id)}
                      style={{ color: "#333", fontSize: 18, lineHeight: 1 }}>✕</motion.button>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* Free cap notice */}
          {!isPremium && children.length >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ ...card, borderLeft: "2px solid #ffe66d", padding: 16,
                       fontSize: 13, color: "#888" }}>
              Free plan is limited to 1 child profile.{" "}
              <a href="/premium" style={{ color: "#ff3c3c", fontFamily: "DM Mono, monospace", fontSize: 11 }}>
                UPGRADE →
              </a>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add child modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div variants={backdropVariants} initial="initial" animate="animate" exit="exit"
            onClick={() => setShowForm(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
                     backdropFilter: "blur(8px)", zIndex: 50,
                     display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit"
              onClick={e => e.stopPropagation()}
              style={{ ...card, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
              <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22,
                            color: "#fff", marginBottom: 20 }}>Add Child Profile</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#555", fontFamily: "DM Mono, monospace",
                                   letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Maria" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#555", fontFamily: "DM Mono, monospace",
                                   letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Age</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 7" min={0} max={17} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#555", fontFamily: "DM Mono, monospace",
                                   letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Conditions <span style={{ color: "#444" }}>(select all that apply)</span>
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {DISEASES.map(d => {
                      const selected = conditions.includes(d.value)
                      return (
                        <motion.button key={d.value} whileTap={{ scale: 0.98 }}
                          onClick={() => toggleCondition(d.value)}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                            borderRadius: 10, textAlign: "left",
                            border: selected ? "1px solid #ff3c3c" : "1px solid rgba(255,255,255,0.06)",
                            background: selected ? "rgba(255,60,60,0.08)" : "rgba(28,28,28,0.6)",
                          }}
                        >
                          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{d.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: selected ? "#ff3c3c" : "#aaa", fontWeight: 600, fontSize: 13 }}>{d.label}</p>
                            <p style={{ color: "#444", fontSize: 11, marginTop: 2 }}>{d.note}</p>
                          </div>
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                            border: selected ? "2px solid #ff3c3c" : "2px solid #333",
                            background: selected ? "#ff3c3c" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {selected && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                  onClick={() => setShowForm(false)}
                  style={{ flex: 1, padding: "12px 0", border: "1px solid rgba(255,255,255,0.08)",
                           borderRadius: 10, color: "#666", fontSize: 12,
                           fontFamily: "DM Mono, monospace", background: "transparent" }}>CANCEL</motion.button>
                <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                  onClick={handleAdd} disabled={saving || !name.trim() || !age}
                  style={{ flex: 1, padding: "12px 0", background: "#ff3c3c", color: "#fff",
                           borderRadius: 10, fontSize: 12, fontWeight: 700,
                           fontFamily: "DM Mono, monospace", letterSpacing: "0.08em",
                           opacity: (saving || !name.trim() || !age) ? 0.5 : 1 }}>
                  {saving ? "SAVING…" : "SAVE PROFILE"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}