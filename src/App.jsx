import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { supabase } from "./services/supabaseclient"
import { ThemeProvider } from "./context/ThemeContext"
import { UserProvider, useUser } from "./context/UserContext"
import useNotificationPoller from "./hooks/useNotificationPoller"
import Navbar               from "./components/Navbar"
import AnimatedBackground   from "./components/AnimatedBackground"
import DisplayNamePrompt    from "./components/DisplayNamePrompt"
import Home         from "./pages/Home"
import Location     from "./pages/Location"
import Child        from "./pages/Child"
import Tips         from "./pages/Tips"
import Premium      from "./pages/Premium"
import UserProfile  from "./pages/UserProfile"
import Login        from "./pages/Login"
import Dashboard    from "./pages/Dashboard"

function PrivateRoute({ session, children }) {
  if (session === undefined) return null
  return session ? children : <Navigate to="/login" replace />
}

function AnimatedRoutes({ session }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login"     element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/"          element={<PrivateRoute session={session}><Home /></PrivateRoute>} />
        <Route path="/location"  element={<PrivateRoute session={session}><Location /></PrivateRoute>} />
        <Route path="/child"     element={<PrivateRoute session={session}><Child /></PrivateRoute>} />
        <Route path="/tips"      element={<PrivateRoute session={session}><Tips /></PrivateRoute>} />
        <Route path="/premium"   element={<PrivateRoute session={session}><Premium /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute session={session}><UserProfile /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute session={session}><Dashboard /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function Inner({ session }) {
  const { showNamePrompt, userId, onNameSet } = useUser()
  const userEmail = session?.user?.email || ""
  useNotificationPoller(userId)   // polls every 15s when notifications granted

  return (
    <>
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen">
        {session && <Navbar />}
        <AnimatedRoutes session={session} />
      </div>
      {showNamePrompt && userId && (
        <DisplayNamePrompt userId={userId} userEmail={userEmail} onDone={onNameSet} />
      )}
    </>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null))
    return () => subscription.unsubscribe()
  }, [])
  return (
    <ThemeProvider>
      <UserProvider>
        <BrowserRouter>
          <Inner session={session} />
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  )
}
