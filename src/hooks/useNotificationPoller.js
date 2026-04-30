import { useEffect } from "react"
import { supabase } from "../services/supabaseclient"
import { fireNotification } from "../services/notifications"

export default function useNotificationPoller(userId) {
  useEffect(() => {
    if (!userId || Notification.permission !== "granted") return

    const poll = async () => {
      const { data, error } = await supabase
        .from("notifications_queue")
        .select("*")
        .eq("sent", false)
        .or(`target.eq.all,target.eq.${userId}`)
        .order("created_at", { ascending: true })

      if (error || !data?.length) return
      for (const n of data) {
        fireNotification(n.title, n.body)
        await supabase.from("notifications_queue").update({ sent: true }).eq("id", n.id)
      }
    }

    poll()
    const id = setInterval(poll, 15000)
    return () => clearInterval(id)
  }, [userId])
}
