// NeuroWatch AI — Emergency Service Worker
// Handles background Web Push Notifications for emergency alerts

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push events from server
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🚨 NeuroWatch Emergency Alert';
  const options = {
    body: data.body || 'High risk detected! Immediate attention required.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [500, 200, 500, 200, 1000, 200, 500],
    tag: 'neurowatch-emergency',
    requireInteraction: true,  // Won't auto-dismiss
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: '🔍 View Dashboard' },
      { action: 'dismiss', title: '✖ Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
        return clientList[0].navigate(event.notification.data.url || '/');
      }
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
