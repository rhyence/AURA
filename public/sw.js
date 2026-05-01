// sw.js — Aura Service Worker (Web Push enabled)
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Real Web Push from Supabase Edge Function
self.addEventListener('push', e => {
  if (!e.data) return
  let payload
  try { payload = e.data.json() } catch { payload = { title: 'AURA Alert', body: e.data.text() } }

  const { title = 'AURA', body = '', tag, url = '/' } = payload

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: tag || 'aura-alert',
      renotify: true,
      data: { url },
    })
  )
})

// Tap notification → open/focus app
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const target = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); return existing.navigate(target) }
      return clients.openWindow(target)
    })
  )
})
