import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../services/supabaseclient"
import { buttonVariants } from "../animations/variants"

const inp = {
  width: "100%", padding: "11px 16px",
  background: "rgba(28,28,28,0.9)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, color: "#e8e8e8", fontSize: 13,
  outline: "none", fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
}

const card = {
  background: "rgba(22,22,22,0.92)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(24px)",
  borderRadius: 20,
}

export default function Login() {
  const navigate = useNavigate()
  const [mode,     setMode]     = useState("signin")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null); setSuccess(null)
    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message)
      else setSuccess("Check your email for a confirmation link!")
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message)
      else navigate("/")
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true); setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    })
    if (err) { setError(err.message); setLoading(false) }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("Enter your email above first."); return }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess("Password reset email sent! Check your inbox.")
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{ textAlign: "center", marginBottom: 36 }}
      >
        <h1 style={{
          fontFamily: "Syne, sans-serif", fontWeight: 800,
          fontSize: 48, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1,
        }}>
          AURA<span style={{ color: "#ff3c3c" }}>.</span>
        </h1>
        <p style={{ color: "#444", fontSize: 13, marginTop: 8, fontFamily: "DM Mono, monospace" }}>
          real-time air quality, for your health
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
        style={{ ...card, padding: 28, width: "100%", maxWidth: 380 }}
      >

        {/* Mode tabs */}
        <div style={{
          display: "flex", gap: 4,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {["signin", "signup"].map(tab => (
            <button key={tab}
              onClick={() => { setMode(tab); setError(null); setSuccess(null) }}
              style={{
                flex: 1, padding: "9px 0",
                borderRadius: 9, fontSize: 12, fontWeight: 600,
                fontFamily: "DM Mono, monospace", letterSpacing: "0.06em",
                background: mode === tab ? "#ff3c3c" : "transparent",
                color: mode === tab ? "#fff" : "#555",
                transition: "all 0.2s",
                cursor: "pointer",
              }}
            >
              {tab === "signin" ? "SIGN IN" : "SIGN UP"}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 600, color: "#444",
              fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
              textTransform: "uppercase", marginBottom: 6,
            }}>Email</p>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inp}
            />
          </div>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 600, color: "#444",
              fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
              textTransform: "uppercase", marginBottom: 6,
            }}>Password</p>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" minLength={6}
              style={inp}
            />
          </div>
        </div>

        {/* Feedback */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p key="err"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                fontSize: 12, color: "#ff3c3c",
                background: "rgba(255,60,60,0.08)",
                border: "1px solid rgba(255,60,60,0.15)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 14,
                fontFamily: "DM Mono, monospace",
              }}
            >{error}</motion.p>
          )}
          {success && (
            <motion.p key="ok"
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                fontSize: 12, color: "#4ecdc4",
                background: "rgba(78,205,196,0.08)",
                border: "1px solid rgba(78,205,196,0.15)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 14,
                fontFamily: "DM Mono, monospace",
              }}
            >{success}</motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
          onClick={handleSubmit} disabled={loading}
          style={{
            width: "100%", padding: "13px 0",
            background: "#ff3c3c", color: "#fff",
            borderRadius: 10, fontSize: 12, fontWeight: 700,
            fontFamily: "DM Mono, monospace", letterSpacing: "0.1em",
            opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 20,
          }}
        >
          {loading ? "PLEASE WAIT…" : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
        </motion.button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
          <span style={{ fontSize: 11, color: "#333", fontFamily: "DM Mono, monospace" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        </div>

        {/* Google */}
        <motion.button
          variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
          onClick={handleGoogle} disabled={loading}
          style={{
            width: "100%", padding: "12px 0",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, fontSize: 12, fontWeight: 600,
            fontFamily: "DM Mono, monospace", letterSpacing: "0.06em",
            color: "#ccc", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10,
            opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.233 17.64 11.925 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          CONTINUE WITH GOOGLE
        </motion.button>

        {/* Forgot password */}
        <AnimatePresence>
          {mode === "signin" && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#444", fontFamily: "DM Mono, monospace" }}
            >
              Forgot password?{" "}
              <button
                onClick={handleForgotPassword}
                style={{ color: "#4ecdc4", fontWeight: 600, background: "none", cursor: "pointer" }}
              >Reset it</button>
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
