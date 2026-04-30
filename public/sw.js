// sw.js - Service Worker for Aura PWA push notifications
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Handle push events from server (future FCM upgrade path)
self.addEventListener('push', e => {
  if (!e.data) return
  const { title, body } = e.data.json()
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    })
  )
})

// Handle notification click — focus or open the app
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus()
      return clients.openWindow('/')
    })
  )
})
