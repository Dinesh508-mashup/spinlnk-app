import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_NOTIFICATIONS = 3;
const AUTO_CLEAR_MS = 8 * 60 * 60 * 1000; // 8 hours

function getStorageKey(hostelId) {
  return hostelId ? `spinlnk_notifications_${hostelId}` : null;
}

function loadNotifications(hostelId) {
  const key = getStorageKey(hostelId);
  if (!key) return [];
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    // Auto-cleanup: remove notifications older than 8 hours
    const cutoff = Date.now() - AUTO_CLEAR_MS;
    return list.filter(n => n.time > cutoff);
  } catch { return []; }
}

function saveNotifications(hostelId, list) {
  const key = getStorageKey(hostelId);
  if (!key) return;
  // Only keep latest 3
  localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_NOTIFICATIONS)));
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function useNotifications(hostelId) {
  const [notifications, setNotifications] = useState(() => loadNotifications(hostelId));
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMachinesRef = useRef(null);
  const alertedRef = useRef(new Set());
  const hostelIdRef = useRef(hostelId);

  // Reset state when hostel changes
  useEffect(() => {
    if (hostelId !== hostelIdRef.current) {
      hostelIdRef.current = hostelId;
      prevMachinesRef.current = null;
      alertedRef.current.clear();
      setNotifications(loadNotifications(hostelId));
    }
  }, [hostelId]);

  // Auto-cleanup: check every 5 minutes for expired notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - AUTO_CLEAR_MS;
      setNotifications(prev => {
        const filtered = prev.filter(n => n.time > cutoff);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
    saveNotifications(hostelId, notifications);
  }, [notifications, hostelId]);

  const addNotification = useCallback((type, title, message, icon) => {
    if (!hostelId) return null;
    const id = Date.now() + Math.random();
    const notif = { id, type, title, message, icon, time: Date.now(), read: false, hostelId };

    setNotifications(prev => {
      // Add new, keep only latest 3
      const updated = [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
      return updated;
    });

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body: message, icon: '/favicon.svg' }); } catch {}
    }

    // Vibrate on mobile
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    return notif;
  }, [hostelId]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    alertedRef.current.clear();
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // ===== Core trigger: check machine state changes =====
  const checkMachineEvents = useCallback((machines, currentUserName) => {
    if (!machines || !currentUserName || !hostelId) return;
    const prev = prevMachinesRef.current;
    prevMachinesRef.current = machines;
    if (!prev) return;

    const now = Date.now();

    for (const m of machines) {
      if (m.hostel_id && m.hostel_id !== hostelId) continue;

      const prevM = prev.find(p => p.machine_key === m.machine_key && (!p.hostel_id || p.hostel_id === hostelId));
      if (!prevM) continue;

      // === STATUS: User started a machine (was free, now in-use) ===
      if (prevM.status === 'free' && m.status === 'in-use' && m.user_name) {
        const alertKey = `status_${hostelId}_${m.machine_key}_${m.end_time}`;
        if (!alertedRef.current.has(alertKey)) {
          alertedRef.current.add(alertKey);
          addNotification(
            'status',
            'Machine In Use',
            `${m.user_name} is currently using ${m.name}.`,
            'booked'
          );
        }
      }

      // === COMPLETION/FREE: Machine just became free ===
      if (prevM.status === 'in-use' && (m.status === 'free' || (m.status === 'in-use' && m.end_time && now >= m.end_time))) {
        const alertKey = `completed_${hostelId}_${m.machine_key}_${prevM.end_time}`;
        if (!alertedRef.current.has(alertKey)) {
          alertedRef.current.add(alertKey);

          addNotification(
            'session_complete',
            'Machine Free',
            `${m.name} is now FREE; ${prevM.user_name || 'User'} has completed their cycle.`,
            'done'
          );

          // === QUEUE: Notify next person in queue ===
          const queueMembers = prevM.queue_members || [];
          if (queueMembers.length > 0) {
            addNotification(
              'queue_next',
              'Queue Update',
              `${queueMembers[0].name} is next in queue for ${m.name}.`,
              'queue'
            );
          }
        }
      }

      // === TIMER WARNING — 5 minutes left ===
      if (m.status === 'in-use' && m.end_time && m.user_name?.toLowerCase() === currentUserName.toLowerCase()) {
        const remaining = m.end_time - now;
        if (remaining > 0 && remaining <= 5 * 60 * 1000) {
          const alertKey = `warning5_${hostelId}_${m.machine_key}_${m.end_time}`;
          if (!alertedRef.current.has(alertKey)) {
            alertedRef.current.add(alertKey);
            const mins = Math.ceil(remaining / 60000);
            addNotification(
              'timer_warning',
              'Almost Done!',
              `${m.name} has ${mins} minute${mins > 1 ? 's' : ''} remaining. Get ready to collect your clothes.`,
              'warning'
            );
          }
        }
      }
    }
  }, [addNotification, hostelId]);

  // ===== Trigger: booking confirmation =====
  const notifyBookingConfirmed = useCallback((machineName, userName, cycleName, minutes) => {
    addNotification(
      'status',
      'Machine In Use',
      `${userName} is currently using ${machineName}.`,
      'booked'
    );
  }, [addNotification]);

  // ===== Trigger: joined queue =====
  const notifyQueueJoined = useCallback((machineName, position, userName) => {
    addNotification(
      'queue_next',
      'Queue Update',
      `${userName} is next in queue for ${machineName}.`,
      'queue'
    );
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAllRead,
    clearAll,
    requestPermission,
    checkMachineEvents,
    notifyBookingConfirmed,
    notifyQueueJoined,
  };
}
