import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../services/supabaseclient"

const UserContext = createContext({ plan:"free", isPremium:false, loading:true, displayName:"", showNamePrompt:false })

export function UserProvider({ children }) {
  const [plan,           setPlan]           = useState("free")
  const [displayName,    setDisplayName]    = useState("")
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [userId,         setUserId]         = useState(null)
  const [loading,        setLoading]        = useState(true)

  async function fetchProfile(user) {
    setUserId(user.id)
    const { data } = await supabase.from("profiles").select("plan,display_name,last_location").eq("id", user.id).maybeSingle()
    if (data?.plan)         setPlan(data.plan)
    if (data?.display_name) setDisplayName(data.display_name)
    if (data?.last_location && !localStorage.getItem("airaware_location"))
      localStorage.setItem("airaware_location", JSON.stringify(data.last_location))
    else                    setShowNamePrompt(true)   // first login — no name yet
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) fetchProfile(user); else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) fetchProfile(session.user); else { setPlan("free"); setDisplayName(""); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleNameSet = (name) => { setDisplayName(name); setShowNamePrompt(false) }

  return (
    <UserContext.Provider value={{ plan, isPremium: plan==="premium", loading, displayName, showNamePrompt, userId, onNameSet: handleNameSet }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
