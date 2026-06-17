// Service Worker — MeuPet+ Notifications
const BASE = '/meupet-app';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Clique na notificação → abre o app na tela certa
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url ?? (BASE + '/calendario/');
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const win = clients.find(c => c.focused || c.url.includes(BASE));
      if (win) { win.focus(); win.navigate(url); }
      else self.clients.openWindow(url);
    })
  );
});

// Escuta mensagem do app para disparar notificações
self.addEventListener('message', e => {
  if (e.data?.type !== 'SHOW_NOTIFICATIONS') return;
  const notifs = e.data.notifications ?? [];
  notifs.forEach(n => {
    self.registration.showNotification(n.title, {
      body: n.body,
      icon: BASE + '/icons/icon-192.png',
      badge: BASE + '/icons/icon-192.png',
      tag: n.tag,
      renotify: false,
      data: { url: BASE + '/calendario/' },
    });
  });
});
