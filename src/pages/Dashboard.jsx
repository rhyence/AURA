import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import AnimatedPage from "../components/AnimatedPage"
import { supabase } from "../services/supabaseclient"
import { buttonVariants, scrollReveal, staggerContainer, cardVariants } from "../animations/variants"

const ADMIN_EMAILS = ["andalrhyence@gmail.com"] // ← replace with your email(s)
const SUPER_ADMIN_EMAIL = "andalrhyence@gmail.com" // Only this account can remove admins

const card = {
  background: "rgba(22,22,22,0.85)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
}

const inp = {
  width: "100%", padding: "10px 14px",
  background: "rgba(28,28,28,0.9)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, color: "#e8e8e8", fontSize: 13,
  outline: "none", fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
}

const PLANS = ["free", "premium"]

export default function Dashboard() {
  const navigate = useNavigate()
  const [currentUser,   setCurrentUser]   = useState(null)
  const [authorized,    setAuthorized]    = useState(null) // null=loading
  const [users,         setUsers]         = useState([])
  const [loadingUsers,  setLoadingUsers]  = useState(true)
  const [savingId,      setSavingId]      = useState(null)
  const [toast,         setToast]         = useState(null)

  // Notification state
  const [notifTitle,    setNotifTitle]    = useState("")
  const [notifBody,     setNotifBody]     = useState("")
  const [notifTarget,   setNotifTarget]   = useState("all") // "all" | user_id
  const [sendingNotif,  setSendingNotif]  = useState(false)

  // Add admin state
  const [newAdminEmail,  setNewAdminEmail]  = useState("")
  const [addingAdmin,    setAddingAdmin]    = useState(false)
  const [adminList,      setAdminList]      = useState([]) // { id, user_id, email }
  const [removingAdmin,  setRemovingAdmin]  = useState(null) // id being removed
  const [isSuperAdmin,   setIsSuperAdmin]   = useState(false)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate("/login"); return }
      setCurrentUser(user)

      // Check admin table
      const { data } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (data) {
        setAuthorized(true)
      } else {
        // Fallback: allow hardcoded emails during initial setup
        setAuthorized(ADMIN_EMAILS.includes(user.email))
      }
      setIsSuperAdmin(user.email === SUPER_ADMIN_EMAIL)
    }
    check()
  }, [navigate])

  // ── Load users ───────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, email, plan")
      .order("email", { ascending: true })
    if (!error) setUsers(data || [])
    setLoadingUsers(false)
  }, [])

  useEffect(() => {
    if (authorized) loadUsers()
  }, [authorized, loadUsers])

  // ── Load admin list ──────────────────────────────────────────────────────────
  const loadAdmins = useCallback(async () => {
    const { data: adminRows, error } = await supabase
      .from("admins")
      .select("id, user_id")
      .order("id", { ascending: true })
    if (error || !adminRows) { setAdminList([]); return }

    // Fetch profile info for each admin separately (avoids FK join requirement)
    const enriched = await Promise.all(adminRows.map(async (a) => {
      const { data: p } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", a.user_id)
        .maybeSingle()
      return { ...a, profiles: p || {} }
    }))
    setAdminList(enriched)
  }, [])

  useEffect(() => {
    if (authorized) loadAdmins()
  }, [authorized, loadAdmins])

  // ── Change plan ──────────────────────────────────────────────────────────────
  const handlePlanChange = async (userId, newPlan) => {
    setSavingId(userId)
    const { error } = await supabase
      .from("profiles")
      .update({ plan: newPlan })
      .eq("id", userId)
    setSavingId(null)
    if (error) showToast("Failed to update plan.", false)
    else {
      showToast(`Plan updated to ${newPlan}.`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
    }
  }

  // ── Send notification ────────────────────────────────────────────────────────
  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      showToast("Fill in both title and message.", false); return
    }
    setSendingNotif(true)
    const payload = {
      title: notifTitle.trim(),
      body:  notifBody.trim(),
      target: notifTarget, // "all" or a user_id
    }
    const { error } = await supabase.from("notifications_queue").insert([payload])
    setSendingNotif(false)
    if (error) showToast("Failed to queue notification: " + error.message, false)
    else {
      showToast("Notification queued ✓")
      setNotifTitle(""); setNotifBody(""); setNotifTarget("all")
    }
  }

  // ── Add admin ────────────────────────────────────────────────────────────────
  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return
    setAddingAdmin(true)
    // Look up user by email in profiles
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", newAdminEmail.trim())
      .maybeSingle()

    if (pErr || !profile) {
      showToast("User not found. They must sign up first.", false)
      setAddingAdmin(false); return
    }
    const { error } = await supabase.from("admins").insert([{ user_id: profile.id }])
    setAddingAdmin(false)
    if (error) showToast("Failed to add admin: " + error.message, false)
    else { showToast(`${newAdminEmail} is now an admin.`); setNewAdminEmail(""); loadAdmins() }
  }

  // ── Remove admin (super admin only) ─────────────────────────────────────────
  const handleRemoveAdmin = async (adminRow) => {
    if (!isSuperAdmin) { showToast("Only the super admin can remove admins.", false); return }
    const adminEmail = adminRow.profiles?.email || ""
    // Prevent removing yourself (super admin)
    if (adminEmail === SUPER_ADMIN_EMAIL || adminRow.user_id === currentUser?.id) {
      showToast("You cannot remove yourself.", false); return
    }
    setRemovingAdmin(adminRow.id)
    const { error } = await supabase.from("admins").delete().eq("id", adminRow.id)
    setRemovingAdmin(null)
    if (error) showToast("Failed to remove admin: " + error.message, false)
    else { showToast(`Admin access revoked.`); loadAdmins() }
  }

  // ── Render states ────────────────────────────────────────────────────────────
  // ── Support chat state ──────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([])
  const [activeConv,    setActiveConv]    = useState(null)
  const [convMessages,  setConvMessages]  = useState([])
  const [adminReply,    setAdminReply]    = useState("")
  const [sendingReply,  setSendingReply]  = useState(false)
  const [showSupport,   setShowSupport]   = useState(false)

  const loadConversations = async () => {
    const { data } = await supabase.from("support_conversations")
      .select("*").order("last_message_at", { ascending: false })
    setConversations(data || [])
  }

  const openConv = async (conv) => {
    setActiveConv(conv)
    const { data } = await supabase.from("support_messages")
      .select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true })
    setConvMessages(data || [])
  }

  const sendAdminReply = async () => {
    if (!adminReply.trim() || !activeConv) return
    setSendingReply(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("support_messages").insert({
      conversation_id: activeConv.id, sender_id: user.id,
      is_admin: true, content: adminReply.trim()
    })
    await supabase.from("support_conversations")
      .update({ last_message: adminReply.trim(), last_message_at: new Date().toISOString(), status: "replied" })
      .eq("id", activeConv.id)
    setAdminReply(""); setSendingReply(false)
    openConv(activeConv); loadConversations()
  }

  // Realtime for admin
  useEffect(() => {
    if (!showSupport) return
    loadConversations()
    const ch = supabase.channel("admin-support")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" },
        () => { if (activeConv) openConv(activeConv); loadConversations() })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [showSupport])

  if (authorized === null) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "2px solid #ff3c3c", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
    </div>
  )

  if (authorized === false) return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <span style={{ fontSize: 48 }}>🚫</span>
        <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, color: "#fff" }}>Access Denied</h2>
        <p style={{ color: "#555", fontSize: 13, fontFamily: "DM Mono, monospace" }}>You don't have dashboard access.</p>
        <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
          onClick={() => navigate("/")}
          style={{ padding: "10px 24px", background: "#ff3c3c", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Mono, monospace" }}
        >GO HOME</motion.button>
      </div>
    </AnimatedPage>
  )

  return (
    <AnimatedPage>
      <div style={{ minHeight: "100vh", padding: "32px 16px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Header */}
          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32, color: "#fff", letterSpacing: "-0.02em" }}>
                Dashboard<span style={{ color: "#ff3c3c" }}>.</span>
              </h1>
              <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 600, fontFamily: "DM Mono, monospace", letterSpacing: "0.08em", background: "rgba(255,60,60,0.12)", color: "#ff3c3c" }}>
                ADMIN
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <p style={{ color: "#555", fontSize: 13, fontFamily: "DM Mono, monospace" }}>
                {currentUser?.email}
              </p>
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={() => setShowSupport(true)}
                style={{ padding: "6px 14px", background: "rgba(78,205,196,0.1)", color: "#4ecdc4",
                         borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: "DM Mono, monospace",
                         border: "1px solid rgba(78,205,196,0.2)", letterSpacing: "0.08em" }}>
                💬 SUPPORT CHATS
              </motion.button>
            </div>
          </motion.div>

          {/* ── Users table ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ ...card, borderTop: "2px solid #ff3c3c", overflow: "hidden" }}>

            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 11, color: "#aaa", fontFamily: "DM Mono, monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Users ({users.length})
                </h2>
                <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                  onClick={loadUsers}
                  style={{ fontSize: 11, color: "#555", fontFamily: "DM Mono, monospace", background: "none", cursor: "pointer" }}
                >↺ refresh</motion.button>
              </div>
            </div>

            {loadingUsers ? (
              <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
                <div style={{ width: 28, height: 28, border: "2px solid #ff3c3c", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p style={{ padding: 24, color: "#444", fontSize: 13, fontFamily: "DM Mono, monospace", textAlign: "center" }}>No users found.</p>
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate">
                {users.map((u, i) => (
                  <motion.div key={u.id} variants={cardVariants}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr auto",
                      alignItems: "center", gap: 16,
                      padding: "14px 20px",
                      borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      {/* Display name */}
                      <p style={{ fontSize: 13, color: "#e8e8e8", fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.display_name || <span style={{ color: "#444", fontStyle: "italic" }}>no display name</span>}
                      </p>
                      {/* Email */}
                      <p style={{ fontSize: 11, color: "#555", fontFamily: "DM Mono, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email || u.id}
                      </p>
                    </div>

                    {/* Plan selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {savingId === u.id ? (
                        <div style={{ width: 16, height: 16, border: "2px solid #ff3c3c", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
                      ) : (
                        <select
                          value={u.plan || "free"}
                          onChange={e => handlePlanChange(u.id, e.target.value)}
                          style={{
                            padding: "6px 10px",
                            background: "rgba(28,28,28,0.9)",
                            border: `1px solid ${u.plan === "premium" ? "rgba(255,60,60,0.3)" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: 8, color: u.plan === "premium" ? "#ff3c3c" : "#666",
                            fontSize: 11, fontWeight: 600, fontFamily: "DM Mono, monospace",
                            letterSpacing: "0.06em", cursor: "pointer", outline: "none",
                          }}
                        >
                          {PLANS.map(p => (
                            <option key={p} value={p} style={{ background: "#1a1a1a" }}>
                              {p.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* ── Send Notification ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ ...card, borderTop: "2px solid #ffe66d", padding: 24 }}>

            <h2 style={{ fontSize: 11, color: "#aaa", fontFamily: "DM Mono, monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
              🔔 Send Notification
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Target</p>
                <select
                  value={notifTarget}
                  onChange={e => setNotifTarget(e.target.value)}
                  style={{ ...inp }}
                >
                  <option value="all">All users</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.display_name || u.email || u.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Title</p>
                <input
                  type="text" value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                  placeholder="e.g. AQI Alert"
                  style={inp}
                />
              </div>
              <div>
                <p style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Message</p>
                <textarea
                  value={notifBody} onChange={e => setNotifBody(e.target.value)}
                  placeholder="e.g. Air quality in your area has reached Unhealthy levels."
                  rows={3}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={handleSendNotification} disabled={sendingNotif}
                style={{
                  padding: "12px 0", background: "#ffe66d", color: "#111",
                  borderRadius: 10, fontSize: 12, fontWeight: 700,
                  fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
                  opacity: sendingNotif ? 0.5 : 1, cursor: sendingNotif ? "not-allowed" : "pointer",
                }}
              >{sendingNotif ? "SENDING…" : "SEND NOTIFICATION"}</motion.button>
            </div>
          </motion.div>

          {/* ── Add Admin ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ ...card, borderTop: "2px solid #4ecdc4", padding: 24 }}>

            <h2 style={{ fontSize: 11, color: "#aaa", fontFamily: "DM Mono, monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
              🛡️ Admin Access
            </h2>

            {/* Current admins list */}
            {adminList.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                  Current Admins
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {adminList.map(a => {
                    const email = a.profiles?.email || a.user_id
                    const name = a.profiles?.display_name
                    const isSelf = a.user_id === currentUser?.id
                    return (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", background: "rgba(78,205,196,0.05)",
                        border: "1px solid rgba(78,205,196,0.12)", borderRadius: 10,
                      }}>
                        <div>
                          {name && <p style={{ fontSize: 12, color: "#e8e8e8", fontWeight: 600, marginBottom: 2 }}>{name}</p>}
                          <p style={{ fontSize: 11, color: "#555", fontFamily: "DM Mono, monospace" }}>{email}</p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isSelf && (
                            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, background: "rgba(78,205,196,0.1)", color: "#4ecdc4", fontFamily: "DM Mono, monospace", letterSpacing: "0.08em" }}>
                              YOU
                            </span>
                          )}
                          {isSuperAdmin && !isSelf && (
                            removingAdmin === a.id ? (
                              <div style={{ width: 16, height: 16, border: "2px solid #ff3c3c", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => handleRemoveAdmin(a)}
                                style={{
                                  padding: "4px 10px", background: "rgba(255,60,60,0.1)",
                                  border: "1px solid rgba(255,60,60,0.25)", borderRadius: 7,
                                  color: "#ff3c3c", fontSize: 10, fontWeight: 600,
                                  fontFamily: "DM Mono, monospace", cursor: "pointer",
                                }}>
                                REMOVE
                              </motion.button>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add new admin */}
            <p style={{ fontSize: 10, color: "#444", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Add New Admin
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ ...inp, flex: 1 }}
              />
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={handleAddAdmin} disabled={addingAdmin}
                style={{
                  padding: "10px 18px", background: "#4ecdc4", color: "#111",
                  borderRadius: 10, fontSize: 11, fontWeight: 700,
                  fontFamily: "DM Mono, monospace", letterSpacing: "0.08em",
                  flexShrink: 0, opacity: addingAdmin ? 0.5 : 1,
                  cursor: addingAdmin ? "not-allowed" : "pointer",
                }}
              >{addingAdmin ? "…" : "ADD"}</motion.button>
            </div>
            <p style={{ marginTop: 10, fontSize: 11, color: "#333", fontFamily: "DM Mono, monospace" }}>
              The user must already have an account. {isSuperAdmin ? "Only you can remove admins." : "Contact the super admin to remove access."}
            </p>
          </motion.div>

        </div>
      </div>

      {/* ── Support Conversations ── */}
      <AnimatePresence>
        {showSupport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                     backdropFilter: "blur(8px)", zIndex: 200,
                     display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              style={{ width: "100%", maxWidth: 860, background: "rgba(12,12,12,0.98)",
                       border: "1px solid rgba(255,255,255,0.08)",
                       borderRadius: "20px 20px 0 0",
                       display: "flex", flexDirection: "column",
                       height: "92dvh", overflow: "hidden" }}>

              {/* Top bar */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                             display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                {activeConv ? (
                  <button onClick={() => setActiveConv(null)}
                    style={{ color: "#aaa", fontSize: 13, fontFamily: "DM Mono, monospace",
                               background: "none", border: "none", cursor: "pointer" }}>
                    ← Back
                  </button>
                ) : (
                  <p style={{ color: "#aaa", fontSize: 11, fontFamily: "DM Mono, monospace",
                               letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Support ({conversations.length})
                  </p>
                )}
                <button onClick={() => { setShowSupport(false); setActiveConv(null) }}
                  style={{ color: "#555", fontSize: 20, background: "none", border: "none", cursor: "pointer" }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

                {/* Conversation list: full width on mobile when no conv selected, sidebar on desktop */}
                <div style={{
                  display: activeConv ? "none" : "flex",
                  flexDirection: "column",
                  width: "100%",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                  flexShrink: 0,
                  ...(window.innerWidth >= 600 ? { display: "flex", width: 260 } : {}),
                }}>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {conversations.length === 0 && (
                      <p style={{ color: "#444", fontSize: 12, padding: 20, fontFamily: "DM Mono, monospace", textAlign: "center", marginTop: 40 }}>
                        No conversations yet
                      </p>
                    )}
                    {conversations.map(c => (
                      <div key={c.id} onClick={() => openConv(c)}
                        style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                                  cursor: "pointer",
                                  background: activeConv?.id === c.id ? "rgba(255,60,60,0.08)" : "transparent" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ color: "#e8e8e8", fontSize: 13, fontWeight: 600 }}>
                            {c.user_name || c.user_email}
                          </p>
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, fontFamily: "DM Mono, monospace",
                                         background: c.status === "open" ? "rgba(255,230,109,0.1)" : "rgba(78,205,196,0.1)",
                                         color: c.status === "open" ? "#ffe66d" : "#4ecdc4" }}>
                            {c.status}
                          </span>
                        </div>
                        <p style={{ color: "#555", fontSize: 11, overflow: "hidden",
                                     textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.last_message || "No messages yet"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message thread */}
                <div style={{ flex: 1, minWidth: 0,
                               display: activeConv ? "flex" : "none", flexDirection: "column",
                               ...(window.innerWidth >= 600 ? { display: "flex" } : {}) }}>
                  {!activeConv ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <p style={{ color: "#333", fontSize: 13, fontFamily: "DM Mono, monospace" }}>
                        Select a conversation
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                        <p style={{ color: "#e8e8e8", fontWeight: 700, fontSize: 14 }}>
                          {activeConv.user_name || activeConv.user_email}
                        </p>
                        <p style={{ color: "#444", fontSize: 11, fontFamily: "DM Mono, monospace" }}>
                          {activeConv.user_email}
                        </p>
                      </div>
                      <div style={{ flex: 1, overflowY: "auto", padding: 16, minHeight: 0,
                                     display: "flex", flexDirection: "column", gap: 10 }}>
                        {convMessages.map(m => (
                          <div key={m.id} style={{ display: "flex", justifyContent: m.is_admin ? "flex-end" : "flex-start" }}>
                            <div style={{
                              maxWidth: "80%", padding: "10px 14px", fontSize: 13, lineHeight: 1.5,
                              color: "#e8e8e8", wordBreak: "break-word",
                              borderRadius: m.is_admin ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                              background: m.is_admin ? "#ff3c3c" : "rgba(255,255,255,0.06)",
                            }}>
                              {!m.is_admin && <p style={{ fontSize: 10, color: "#555", fontFamily: "DM Mono, monospace", marginBottom: 4 }}>USER</p>}
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)",
                                     display: "flex", gap: 8, flexShrink: 0 }}>
                        <input value={adminReply} onChange={e => setAdminReply(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && sendAdminReply()}
                          placeholder="Type a reply…"
                          style={{ flex: 1, minWidth: 0, padding: "10px 14px", background: "rgba(28,28,28,0.9)",
                                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                                    color: "#e8e8e8", fontSize: 13, outline: "none", fontFamily: "Inter, sans-serif" }} />
                        <motion.button whileTap={{ scale: 0.92 }} onClick={sendAdminReply}
                          disabled={sendingReply || !adminReply.trim()}
                          style={{ padding: "10px 16px", background: adminReply.trim() ? "#ff3c3c" : "#222",
                                    color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700,
                                    flexShrink: 0, transition: "background 0.2s" }}>→</motion.button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            style={{
              position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
              padding: "12px 20px", borderRadius: 10, zIndex: 100,
              background: toast.ok ? "rgba(78,205,196,0.12)" : "rgba(255,60,60,0.12)",
              border: `1px solid ${toast.ok ? "rgba(78,205,196,0.3)" : "rgba(255,60,60,0.3)"}`,
              color: toast.ok ? "#4ecdc4" : "#ff3c3c",
              fontSize: 12, fontFamily: "DM Mono, monospace",
              whiteSpace: "nowrap",
            }}
          >{toast.msg}</motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}