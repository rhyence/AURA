import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../services/supabaseclient"
import { useUser } from "../context/UserContext"

const bubble = {
  position: "fixed", bottom: 80, right: 16, zIndex: 100,
}

const chatWin = {
  position: "fixed", bottom: 140, right: 16, zIndex: 100,
  width: "min(360px, calc(100vw - 32px))",
  background: "rgba(14,14,14,0.97)", border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)", borderRadius: 20,
  display: "flex", flexDirection: "column", overflow: "hidden",
  boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
}

export default function SupportChat() {
  const { userId, displayName } = useUser()
  const [open,       setOpen]       = useState(false)
  const [messages,   setMessages]   = useState([])
  const [convId,     setConvId]     = useState(null)
  const [input,      setInput]      = useState("")
  const [sending,    setSending]    = useState(false)
  const [unread,     setUnread]     = useState(0)
  const bottomRef = useRef(null)

  // Get or create conversation
  useEffect(() => {
    if (!userId) return
    supabase.from("support_conversations")
      .select("id").eq("user_id", userId).single()
      .then(({ data }) => {
        if (data) { setConvId(data.id); loadMessages(data.id) }
      })
  }, [userId])

  const loadMessages = async (cid) => {
    const { data } = await supabase.from("support_messages")
      .select("*").eq("conversation_id", cid).order("created_at", { ascending: true })
    setMessages(data || [])
  }

  // Realtime subscription
  useEffect(() => {
    if (!convId) return
    const ch = supabase.channel(`chat-${convId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages",
        filter: `conversation_id=eq.${convId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        if (!open && payload.new.is_admin) setUnread(u => u + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [convId, open])

  useEffect(() => {
    if (open) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }
  }, [open, messages])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    let cid = convId
    if (!cid) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: conv } = await supabase.from("support_conversations")
        .insert({ user_id: userId, user_email: user.email, user_name: displayName || user.email })
        .select().single()
      cid = conv.id; setConvId(cid)
    }
    await supabase.from("support_messages").insert({
      conversation_id: cid, sender_id: userId, is_admin: false, content: input.trim()
    })
    await supabase.from("support_conversations")
      .update({ last_message: input.trim(), last_message_at: new Date().toISOString() })
      .eq("id", cid)
    setInput(""); setSending(false)
  }

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from("admins").select("user_id").eq("user_id", userId).single()
      .then(({ data }) => setIsAdmin(!!data))
  }, [userId])

  if (!userId || isAdmin) return null

  return (
    <>
      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }} style={chatWin}>

            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                           display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ecdc4" }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: "#e8e8e8", fontWeight: 700, fontSize: 14 }}>Support</p>
                <p style={{ color: "#444", fontSize: 11, fontFamily: "DM Mono, monospace" }}>We typically reply within a few hours</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#444", fontSize: 18 }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16,
                           display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, minHeight: 200 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#444", fontSize: 13, marginTop: 40 }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>👋</p>
                  <p>Hi {displayName || "there"}! How can we help you today?</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} style={{
                  display: "flex", justifyContent: m.is_admin ? "flex-start" : "flex-end"
                }}>
                  <div style={{
                    maxWidth: "78%", padding: "10px 14px", borderRadius: m.is_admin ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                    background: m.is_admin ? "rgba(255,255,255,0.06)" : "#ff3c3c",
                    color: "#e8e8e8", fontSize: 13, lineHeight: 1.5,
                  }}>
                    {m.is_admin && <p style={{ fontSize: 10, color: "#4ecdc4", fontFamily: "DM Mono, monospace",
                                               marginBottom: 4 }}>SUPPORT</p>}
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)",
                           display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Type a message…"
                style={{
                  flex: 1, padding: "10px 14px", background: "rgba(28,28,28,0.9)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                  color: "#e8e8e8", fontSize: 13, outline: "none",
                  fontFamily: "Inter, sans-serif",
                }} />
              <motion.button whileTap={{ scale: 0.92 }} onClick={send} disabled={sending || !input.trim()}
                style={{
                  padding: "10px 16px", background: input.trim() ? "#ff3c3c" : "#222",
                  color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  transition: "background 0.2s",
                }}>→</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <div style={bubble}>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => setOpen(o => !o)}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: open ? "#222" : "#ff3c3c",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 8px 24px rgba(255,60,60,0.3)",
            position: "relative",
          }}>
          {open ? "✕" : "💬"}
          {unread > 0 && !open && (
            <div style={{
              position: "absolute", top: -4, right: -4,
              width: 18, height: 18, borderRadius: "50%",
              background: "#ffe66d", color: "#000",
              fontSize: 10, fontWeight: 700, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>{unread}</div>
          )}
        </motion.button>
      </div>
    </>
  )
}