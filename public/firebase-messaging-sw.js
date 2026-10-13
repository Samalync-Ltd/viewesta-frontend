            /* eslint-disable no-restricted-globals */

/**
 * Firebase Cloud Messaging Service Worker
 *
 * Handles background notifications and notification click events.
 * Firebase config is passed via URL query parameters from the React app
 * so we don't need to hardcode credentials in this public file.
 */

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// ─── Firebase config from URL params ─────────────────────────────────────────
const urlParams = new URLSearchParams(location.search);

const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId'),
};

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined') {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // ─── Background message handler ────────────────────────────────────────────
  // Called when a notification arrives while the app is in the background / closed.
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    // Send the message to the React app (if open in a background tab)
    // so it can format and add it to the Notifications page without waiting for a DB fetch.
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'BACKGROUND_FCM', payload });
      });
    });

    // If the payload has a 'notification' object, the Firebase SDK will automatically 
    // display a notification. We should not show another one to avoid duplicates.
    if (payload.notification) {
      return;
    }

    const title = payload.notification?.title || 'New Notification';
    const body = payload.notification?.body || '';
    const actionUrl = payload.data?.action_url || null;
    const notificationId = payload.data?.notificationId || null;

    const options = {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      // Store action_url in notification data for the click handler
      data: { action_url: actionUrl },
      // Use notificationId as tag to deduplicate OS-level notifications
      tag: notificationId || title,
    };

    self.registration.showNotification(title, options);
  });

  // ─── Notification click handler ─────────────────────────────────────────────
  // Handles clicks on OS notifications (background / when app is closed).
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Firebase's default notification handler wraps the data inside FCM_MSG
    const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data || {};

    // The page for the content the notification is about. The backend's addresses
    // (/movies/ID, /shows/ID) are not pages of this app, so they are mapped to
    // /movie/ID and /series/ID; ids sent as data fields work too.
    const targetPath = (() => {
      const id = (v) => (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim() ? encodeURIComponent(String(v).trim()) : '');
      const show = id(fcmData.show_id || fcmData.showId || fcmData.series_id || fcmData.seriesId);
      if (show) return '/series/' + show;
      const movie = id(fcmData.movie_id || fcmData.movieId);
      if (movie) return '/movie/' + movie;
      const generic = id(fcmData.content_id || fcmData.contentId || fcmData.target_id || fcmData.entity_id || fcmData.related_id);
      if (generic) {
        const kind = String(fcmData.content_type || fcmData.contentType || fcmData.entity_type || fcmData.type || '');
        return (/show|series|episode|season/i.test(kind) ? '/series/' : '/movie/') + generic;
      }
      const raw = String(fcmData.action_url || fcmData.url || fcmData.link || '').trim();
      const text = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '/').replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0];
      const series = text.match(/(?:^|\/)(?:shows?|series)\/([^/]+)\/?$/i);
      if (series) return '/series/' + series[1];
      const film = text.match(/(?:^|\/)(?:movies?|films?)\/([^/]+)\/?$/i);
      if (film) return '/movie/' + film[1];
      return raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
    })();

    const targetUrl = self.location.origin + (targetPath || '/notifications');

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If the app is already open in a tab, focus it and navigate
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  });
} else {
  console.warn('[SW] Firebase config not provided in URL params — notifications disabled.');
}
