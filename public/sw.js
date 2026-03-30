/* SpinLnk Service Worker — background timers, notifications, offline caching */

const CACHE_NAME = 'spinlnk-v2';
const OFFLINE_URLS = ['/home', '/index.html'];

// Active timers: Map of timerId -> { endTime, machineName, type, hostelId }
const activeTimers = new Map();
let timerInterval = null;

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ===== MESSAGE FROM PAGE =====
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};

  if (type === 'REGISTER_TIMER') {
    // Page tells us about an active timer to watch
    const { timerId, endTime, machineName, alarmType, hostelId } = data;
    activeTimers.set(timerId, { endTime, machineName, alarmType, hostelId });
    startTimerCheck();
  }

  if (type === 'CLEAR_TIMER') {
    activeTimers.delete(data.timerId);
    if (activeTimers.size === 0) stopTimerCheck();
  }

  if (type === 'CLEAR_ALL_TIMERS') {
    activeTimers.clear();
    stopTimerCheck();
  }

  if (type === 'STOP_ALARM') {
    // Close any active alarm notifications
    self.registration.getNotifications({ tag: 'spinlnk-alarm' }).then(notifications => {
      notifications.forEach(n => n.close());
    });
  }
});

// ===== TIMER CHECKER =====
function startTimerCheck() {
  if (timerInterval) return;
  timerInterval = setInterval(() => checkTimers(), 5000); // Check every 5 seconds
}

function stopTimerCheck() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function checkTimers() {
  const now = Date.now();

  for (const [timerId, timer] of activeTimers.entries()) {
    if (now >= timer.endTime) {
      activeTimers.delete(timerId);

      // Fire notification
      const isQueue = timer.alarmType === 'queue';
      const title = isQueue ? '🟢 Your Turn!' : '🔴 Time\'s Up!';
      const body = isQueue
        ? `${timer.machineName} — Go grab the machine now!`
        : `${timer.machineName} has finished. Collect your clothes!`;

      await self.registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'spinlnk-alarm',
        renotify: true,
        requireInteraction: true, // Stays visible until user interacts
        vibrate: [1000, 300, 1000, 300, 1000, 300, 1000],
        actions: [
          { action: 'stop', title: '✅ Stop Alarm' },
          { action: 'open', title: '📱 Open App' },
        ],
        data: {
          url: timer.hostelId ? `/home?hostel=${timer.hostelId}` : '/home',
          alarmType: timer.alarmType,
          machineName: timer.machineName,
        },
      });

      // Also tell any open page to fire the in-app alarm
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.postMessage({
          type: 'ALARM_FIRED',
          data: { machineName: timer.machineName, alarmType: timer.alarmType },
        });
      }
    }

    // 5-minute warning notification
    const fiveMinBefore = timer.endTime - 5 * 60 * 1000;
    if (now >= fiveMinBefore && now < fiveMinBefore + 6000 && !timer.warningSent) {
      timer.warningSent = true;
      await self.registration.showNotification('⏰ Almost Done!', {
        body: `${timer.machineName} finishes in 5 minutes. Get ready!`,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'spinlnk-warning',
        vibrate: [300, 100, 300],
        data: {
          url: timer.hostelId ? `/home?hostel=${timer.hostelId}` : '/home',
        },
      });
    }
  }

  if (activeTimers.size === 0) stopTimerCheck();
}

// ===== PUSH NOTIFICATION (server-sent) =====
self.addEventListener('push', (event) => {
  let data = { title: 'SpinLnk', body: 'You have a new update', icon: '/favicon.svg' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [1000, 300, 1000, 300, 1000],
    tag: data.tag || 'spinlnk-notification',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/home' },
    actions: data.actions || [
      { action: 'stop', title: '✅ Stop Alarm' },
      { action: 'open', title: '📱 Open App' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/home';
  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      // Tell all open pages to stop the alarm
      for (const client of clients) {
        client.postMessage({ type: 'STOP_ALARM_FROM_NOTIFICATION' });
      }

      if (action === 'stop') {
        // Just stop — if app is open it'll handle it; if not, notification closes
        // Try to focus existing window
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return;
      }

      // Default & 'open' action: focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
