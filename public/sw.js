// Meshuga B2B Manager - Service Worker
self.addEventListener('install', function(e) {
  self.skipWaiting()
})

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim())
})

self.addEventListener('push', function(e) {
  let data = { title: 'Meshuga B2B', body: 'Nouvelle notification' }
  try { data = e.data ? e.data.json() : data } catch(err) {}
  
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' }
      ]
    })
  )
})

self.addEventListener('notificationclick', function(e) {
  e.notification.close()
  if (e.action === 'close') return
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if (client.url.includes('meshuga') && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('https://meshuga-manager.vercel.app/dashboard')
      }
    })
  )
})
