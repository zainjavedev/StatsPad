/* Shows the game alerts sent by /api/cron/alerts. */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'StatsPad', {body: data.body, icon: '/LOGO.png', badge: '/LOGO.png', data: {url: data.url || '/'}}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
