self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // intentar enfocar la ventana si existe
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if ('focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});

// Escuchar push (sería usado si se integra Push API + servidor)
self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = { title: 'Notificación', body: 'Tienes una notificación' }; }
  const title = data.title || 'Notificación';
  const options = { body: data.body || '', icon: '/IMG/casa-silueta-negra-sin-puerta.png', data: data };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("install", () => {
  console.log("Service Worker instalado");
});

self.addEventListener("fetch", () => {});
