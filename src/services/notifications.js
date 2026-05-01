// VAPID public key — must match the private key in your Supabase Edge Function env
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

// Register service worker
export const registerSW = async () => {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch (err) {
    console.warn('[SW] Registration failed:', err)
    return null
  }
}

// Request permission, subscribe with VAPID, save endpoint to Supabase
export const requestPermission = async (supabase, userId) => {
  if (!('Notification' in window)) return 'denied'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission

  try {
    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] VITE_VAPID_PUBLIC_KEY is not set — cannot subscribe')
      return permission
    }

    const reg = await registerSW()
    if (!reg) return permission

    // Unsubscribe stale subscription so we always get a fresh VAPID-signed one
    let pushSub = await reg.pushManager.getSubscription()
    if (pushSub) {
      try { await pushSub.unsubscribe() } catch {}
      pushSub = null
    }

    // Subscribe with VAPID key
    pushSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    if (!pushSub) {
      console.error('[Push] subscribe() returned null — VAPID key may be invalid')
      return permission
    }

    // Persist to Supabase
    if (supabase && userId) {
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        subscription: JSON.parse(JSON.stringify(pushSub)),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) console.error('[Push] Supabase upsert error:', error)
      else console.log('[Push] Subscription saved for user', userId)
    } else {
      console.warn('[Push] supabase or userId missing — row not saved', { supabase: !!supabase, userId })
    }
  } catch (err) {
    console.error('[Push] Subscription error:', err)
  }

  return permission
}

// Unsubscribe and remove from Supabase
export const removePermission = async (supabase, userId) => {
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
    }
    if (supabase && userId) {
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }
  } catch (err) {
    console.warn('[Push] Unsubscribe error:', err)
  }
}

// Fire a local notification (fallback / in-app use only)
export const fireNotification = async (title, body) => {
  if (Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.ready
  if (reg) {
    reg.showNotification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg' })
  } else {
    new Notification(title, { body, icon: '/favicon.svg' })
  }
}