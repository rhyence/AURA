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

// Request notification permission and register SW
export const requestPermission = async () => {
  if (!('Notification' in window)) return 'denied'
  await registerSW()
  return await Notification.requestPermission()
}

// Fire a local notification via service worker (works on mobile)
export const fireNotification = async (title, body) => {
  if (Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.ready
  if (reg) {
    reg.showNotification(title, { body, icon: '/favicon.svg', badge: '/favicon.svg' })
  } else {
    new Notification(title, { body, icon: '/favicon.svg' })
  }
}