import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import AnimatedPage from "../components/AnimatedPage"
import { supabase } from "../services/supabaseclient"
import { requestPermission, removePermission } from "../services/notifications"
import { useUser } from "../context/UserContext"
import { buttonVariants, scrollReveal, backdropVariants, modalVariants } from "../animations/variants"

const card = { background:"rgba(22,22,22,0.85)", border:"1px solid rgba(255,255,255,0.07)", backdropFilter:"blur(20px)", borderRadius:16 }

export default function UserProfile() {
  const navigate = useNavigate()
  const { isPremium, displayName } = useUser()
  const [user,         setUser]         = useState(null)
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem("airaware_notif") !== "false")
  const [loggingOut,   setLoggingOut]   = useState(false)
  const [cancelling,   setCancelling]   = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [showCancel,   setShowCancel]   = useState(false)
  const [loadingUser,  setLoadingUser]  = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { navigate("/login"); return }
      setUser(u); setLoadingUser(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { if (!s) navigate("/login") })
    return () => subscription.unsubscribe()
  }, [navigate])

  const toggleNotifications = async () => {
    console.log('[Toggle] user?.id =', user?.id)
    const next = !notifEnabled
    if (next) {
      // iOS requires Notification.requestPermission() directly in the gesture,
      // before any other awaits — otherwise it silently blocks
      if (!('Notification' in window)) return
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      // Now do SW registration, VAPID subscribe, Supabase upsert
      await requestPermission(supabase, user?.id)
    } else {
      await removePermission(supabase, user?.id)
    }
    setNotifEnabled(next)
    localStorage.setItem("airaware_notif", String(next))
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    navigate("/login")
  }

  const handleCancelSubscription = async () => {
    setCancelling(true)
    await supabase.from("profiles").update({ plan: "free" }).eq("id", user.id)
    setCancelling(false)
    setShowCancel(false)
    window.location.reload()
  }

  if (loadingUser) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, border:"2px solid #ff3c3c", borderTopColor:"transparent", borderRadius:"50%" }} className="animate-spin" />
    </div>
  )

  const emailDisplay = user?.email || "—"
  const initial = (displayName || emailDisplay)[0]?.toUpperCase() || "?"

  return (
    <AnimatedPage>
      <div style={{ minHeight:"100vh", padding:"32px 16px 80px" }}>
        <div style={{ maxWidth:680, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>

          <motion.div variants={scrollReveal} initial="initial" whileInView="whileInView" viewport={{ once:true }}>
            <h1 style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:32, color:"#fff", letterSpacing:"-0.02em" }}>
              Account<span style={{color:"#ff3c3c"}}>.</span>
            </h1>
            <p style={{ color:"#555", fontSize:13, marginTop:4, fontFamily:"DM Mono,monospace" }}>manage your profile & settings</p>
          </motion.div>

          {/* User card */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
            style={{ ...card, borderTop:"2px solid #ff3c3c", padding:24, display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ width:56, height:56, borderRadius:14, background:"linear-gradient(135deg,#ff3c3c,#ff8c42)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, color:"#fff", fontFamily:"Syne,sans-serif", flexShrink:0 }}>
              {initial}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:"#e8e8e8", fontWeight:600, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {displayName || emailDisplay}
              </p>
              <p style={{ color:"#555", fontSize:11, fontFamily:"DM Mono,monospace", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {displayName ? emailDisplay : ""}
              </p>
              <span style={{ display:"inline-block", marginTop:6, padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600, fontFamily:"DM Mono,monospace", letterSpacing:"0.08em", background: isPremium?"rgba(255,60,60,0.12)":"rgba(255,255,255,0.06)", color: isPremium?"#ff3c3c":"#555" }}>
                {isPremium ? "⭐ PREMIUM" : "FREE PLAN"}
              </span>
            </div>
          </motion.div>

          {/* Subscription section */}
          {!isPremium && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
              style={{ ...card, borderLeft:"2px solid #ff3c3c", padding:20 }}>
              <p style={{ color:"#e8e8e8", fontWeight:600, fontSize:14, marginBottom:6 }}>You're on the Free plan</p>
              <p style={{ color:"#555", fontSize:13, lineHeight:1.6, marginBottom:16 }}>Upgrade to Premium for hourly AQI refresh, unlimited child profiles, and personalized tips.</p>
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={() => navigate("/premium")}
                style={{ padding:"10px 22px", background:"#ff3c3c", color:"#fff", borderRadius:10, fontSize:12, fontWeight:600, fontFamily:"DM Mono,monospace", letterSpacing:"0.08em" }}>
                ⭐ SEE PREMIUM PLANS
              </motion.button>
            </motion.div>
          )}

          {isPremium && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
              style={{ ...card, borderLeft:"2px solid #4ecdc4", padding:20 }}>
              <p style={{ color:"#4ecdc4", fontWeight:600, fontSize:14, marginBottom:4 }}>⭐ Premium Active</p>
              <p style={{ color:"#555", fontSize:13, fontFamily:"DM Mono,monospace", marginBottom:16 }}>hourly refresh · unlimited profiles · personalized tips</p>
              <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={() => setShowCancel(true)}
                style={{ padding:"9px 18px", background:"transparent", border:"1px solid rgba(255,60,60,0.25)", color:"#ff3c3c", borderRadius:10, fontSize:11, fontWeight:600, fontFamily:"DM Mono,monospace", letterSpacing:"0.08em" }}>
                CANCEL SUBSCRIPTION
              </motion.button>
            </motion.div>
          )}

          {/* Settings */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
            style={{ ...card, overflow:"hidden" }}>
            {/* Notifications */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:20 }}>🔔</span>
                <div>
                  <p style={{ color:"#e8e8e8", fontWeight:600, fontSize:13 }}>Push Notifications</p>
                  <p style={{ color:"#444", fontSize:11, fontFamily:"DM Mono,monospace", marginTop:2 }}>{isPremium ? "get alerts when AQI changes" : "premium feature"}</p>
                </div>
              </div>
              {isPremium ? (
                <motion.button whileTap={{ scale:0.92 }} onClick={toggleNotifications} disabled={!user}
                  style={{ position:"relative", width:44, height:24, borderRadius:99, background: notifEnabled?"#ff3c3c":"rgba(255,255,255,0.08)", transition:"background 0.3s", flexShrink:0 }}>
                  <motion.div animate={{ x: notifEnabled?22:2 }} transition={{ type:"spring", stiffness:500, damping:30 }}
                    style={{ position:"absolute", top:3, width:18, height:18, background:"#fff", borderRadius:"50%", boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }} />
                </motion.button>
              ) : (
                <span onClick={() => navigate("/premium")} style={{ fontSize:11, color:"#ff3c3c", cursor:"pointer", fontFamily:"DM Mono,monospace" }}>Upgrade →</span>
              )}
            </div>
            {/* Location */}
            <motion.button whileHover={{ background:"rgba(255,255,255,0.02)" }} whileTap={{ scale:0.99 }}
              onClick={() => navigate("/location")}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", background:"transparent" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:20 }}>📍</span>
                <p style={{ color:"#e8e8e8", fontWeight:600, fontSize:13 }}>Change Location</p>
              </div>
              <span style={{ color:"#333", fontSize:20 }}>›</span>
            </motion.button>
          </motion.div>

          {/* Sign out */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
            <motion.button variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
              onClick={() => setShowConfirm(true)}
              style={{ width:"100%", padding:"14px 0", border:"1px solid rgba(255,60,60,0.2)", borderRadius:12, color:"#ff3c3c", fontSize:13, fontWeight:600, fontFamily:"DM Mono,monospace", letterSpacing:"0.08em", background:"transparent" }}>
              SIGN OUT
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Sign out confirm */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div variants={backdropVariants} initial="initial" animate="animate" exit="exit"
            onClick={() => setShowConfirm(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit"
              onClick={e => e.stopPropagation()}
              style={{ ...card, borderTop:"2px solid #ff3c3c", padding:28, width:"100%", maxWidth:340 }}>
              <p style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:20, color:"#fff", marginBottom:8 }}>Sign out?</p>
              <p style={{ color:"#555", fontSize:13, marginBottom:24, fontFamily:"DM Mono,monospace" }}>You'll need to sign back in to access Aura.</p>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setShowConfirm(false)} style={{ flex:1, padding:"11px 0", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#666", fontSize:12, fontFamily:"DM Mono,monospace", background:"transparent", cursor:"pointer" }}>CANCEL</button>
                <button onClick={handleLogout} disabled={loggingOut}
                  style={{ flex:1, padding:"11px 0", background:"#ff3c3c", borderRadius:10, color:"#fff", fontSize:12, fontWeight:600, fontFamily:"DM Mono,monospace", opacity:loggingOut?0.5:1, cursor:loggingOut?"not-allowed":"pointer" }}>
                  {loggingOut ? "…" : "SIGN OUT"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel subscription confirm */}
      <AnimatePresence>
        {showCancel && (
          <motion.div variants={backdropVariants} initial="initial" animate="animate" exit="exit"
            onClick={() => setShowCancel(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit"
              onClick={e => e.stopPropagation()}
              style={{ ...card, borderTop:"2px solid #ff3c3c", padding:28, width:"100%", maxWidth:340 }}>
              <p style={{ fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:20, color:"#fff", marginBottom:8 }}>Cancel Premium?</p>
              <p style={{ color:"#555", fontSize:13, lineHeight:1.6, marginBottom:24, fontFamily:"DM Mono,monospace" }}>You'll lose hourly refresh, unlimited profiles, and personalized tips. This takes effect immediately.</p>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setShowCancel(false)} style={{ flex:1, padding:"11px 0", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, color:"#666", fontSize:12, fontFamily:"DM Mono,monospace", background:"transparent", cursor:"pointer" }}>KEEP IT</button>
                <button onClick={handleCancelSubscription} disabled={cancelling}
                  style={{ flex:1, padding:"11px 0", background:"#ff3c3c", borderRadius:10, color:"#fff", fontSize:12, fontWeight:600, fontFamily:"DM Mono,monospace", opacity:cancelling?0.5:1, cursor:cancelling?"not-allowed":"pointer" }}>
                  {cancelling ? "…" : "CANCEL"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  )
}