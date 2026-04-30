import { useState, useEffect } from "react"
import { NavLink } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../services/supabaseclient"
import { useUser } from "../context/UserContext"

export default function Navbar() {
  const [open,    setOpen]    = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { isPremium } = useUser()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from("admins").select("id").eq("user_id", user.id).maybeSingle()
      if (data) setIsAdmin(true)
    })
  }, [])

  const links = [
    { to: "/",          label: "Home"      },
    { to: "/location",  label: "Location"  },
    { to: "/child",     label: "Children"  },
    { to: "/tips",      label: "Tips"      },
    { to: "/news",      label: "News"      },
    ...(!isPremium    ? [{ to: "/premium",   label: "Premium"   }] : []),
    ...(isAdmin       ? [{ to: "/dashboard", label: "Dashboard",  }] : []),
  ]

  const linkClass = ({ isActive }) =>
    `text-xs font-mono tracking-widest uppercase transition-colors duration-200 ${isActive ? "text-white" : "text-[#666] hover:text-[#aaa]"}`

  return (
    <nav style={{ position:"sticky", top:0, zIndex:40, background:"rgba(17,17,17,0.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
      <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
        <motion.span className="font-display font-extrabold text-lg tracking-widest text-white" whileHover={{ opacity:0.8 }}>
          AURA<span style={{ color:"#ff3c3c" }}>.</span>
        </motion.span>

        <div className="hidden md:flex gap-7 items-center">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to==="/"} className={linkClass}>
              {label}
            </NavLink>
          ))}
          <NavLink to="/profile">
            {({ isActive }) => (
              <motion.div whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                style={{ width:52, height:52, borderRadius:"50%", border:isActive?"1px solid #ff3c3c":"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:21, color:isActive?"#ff3c3c":"#888" }}>
                👤
              </motion.div>
            )}
          </NavLink>
        </div>

        <div className="md:hidden flex items-center gap-3">
          <NavLink to="/profile">
            <motion.div whileTap={{ scale:0.9 }} style={{ width:52, height:52, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:21, color:"#888" }}>👤</motion.div>
          </NavLink>
          <motion.button whileTap={{ scale:0.92 }} onClick={() => setOpen(p => !p)} style={{ color:"#888", padding:"10px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.22 }}
            style={{ borderTop:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", background:"rgba(17,17,17,0.98)" }}>
            <div className="px-5 py-4 flex flex-col gap-1">
              {links.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to==="/"} onClick={() => setOpen(false)}
                  className={({ isActive }) => `px-3 py-2.5 rounded-lg text-xs font-mono tracking-widest uppercase transition-colors ${isActive?"text-white bg-white/5":"text-[#666] hover:text-[#aaa]"}`}>
                  {label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}