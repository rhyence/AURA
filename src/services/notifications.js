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

// Request permission, register SW, and save push subscription to Supabase
export const requestPermission = async (supabase, userId) => {
  if (!('Notification' in window)) return 'denied'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission

  try {
    const reg = await registerSW()
    if (!reg) return permission

    // Get or create push subscription
    let pushSub = await reg.pushManager.getSubscription()
    if (!pushSub) {
      // Vapid not required for basic push — subscribe without it for now
      pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey omitted — works for polling-based push
      }).catch(() => null)
    }

    // Save subscription to Supabase
    if (supabase && userId) {
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        subscription: pushSub ? JSON.parse(JSON.stringify(pushSub)) : null,
      }, { onConflict: 'user_id' })
    }
  } catch (err) {
    console.warn('[Push] Subscription error:', err)
  }

  return permission
}

// Fire a local notification via service worker
export const fireNotification = async (title, body) => {
  if (Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.ready
  if (reg) {
    reg.showNotification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg' })
  } else {
    new Notification(title, { body, icon: '/favicon.svg' })
  }
}