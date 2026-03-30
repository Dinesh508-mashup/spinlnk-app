import { useState, useEffect, useRef, useCallback } from 'react';

/*
  Lock-screen alarm system:

  1. Silent <audio> loop — keeps Android Chrome process alive when screen is locked
     (Web Audio API alone gets suspended; HTML5 Audio with MediaSession does not)
  2. MediaSession API — shows "Timer Running" on lock screen, prevents OS from killing tab
  3. Service Worker timer — fires system notification as backup when page is frozen
  4. setInterval timer — fires when page is alive (kept alive by silent audio)
  5. Google Timer beeps via Web Audio API — plays when timer expires
  6. System notification — visible on lock screen, clickable
*/

// 0.5s silent WAV as base64 data URI — tiny, loops forever to keep audio session alive
const SILENT_AUDIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

// Helper: send message to service worker
function swMessage(msg) {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

// Helper: show system notification
async function showSystemNotification(title, body, type, hostelId) {
  if (Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg) return;
    await reg.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'spinlnk-alarm',
      renotify: true,
      requireInteraction: true,
      vibrate: [1000, 300, 1000, 300, 1000, 300, 1000],
      actions: [
        { action: 'stop', title: 'Stop Alarm' },
        { action: 'open', title: 'Open App' },
      ],
      data: {
        url: hostelId ? `/home?hostel=${hostelId}` : '/home',
        alarmType: type,
      },
    });
  } catch (e) {
    console.warn('System notification failed:', e);
  }
}

export default function useAlarm() {
  const [ringing, setRinging] = useState(false);
  const [alarmMachine, setAlarmMachine] = useState(null);
  const [alarmType, setAlarmType] = useState(null);
  const [keepAliveActive, setKeepAliveActive] = useState(false);

  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);
  const silentAudioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const prevMachinesRef = useRef(null);
  const timerCheckerRef = useRef(null);
  const pendingAlarmRef = useRef(null);
  const registeredTimersRef = useRef(new Set());
  const autoStopRef = useRef(null);
  const keepAliveStartedRef = useRef(false);

  // ===== Silent audio loop — keeps process alive on locked Android =====
  const startSilentAudio = useCallback(() => {
    if (keepAliveStartedRef.current) return;
    try {
      if (!silentAudioRef.current) {
        const audio = new Audio(SILENT_AUDIO);
        audio.loop = true;
        audio.volume = 0.01; // near-silent but not zero (zero may be optimized away)
        silentAudioRef.current = audio;
      }
      const playPromise = silentAudioRef.current.play();
      if (playPromise) playPromise.catch(() => {});
      keepAliveStartedRef.current = true;

      // MediaSession — shows on lock screen, prevents OS from killing audio
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Timer Running',
          artist: 'SpinLnk',
          album: 'Laundry Timer',
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('pause', null); // don't let user pause
        navigator.mediaSession.setActionHandler('stop', null);
      }
    } catch {}
  }, []);

  const stopSilentAudio = useCallback(() => {
    try {
      silentAudioRef.current?.pause();
      silentAudioRef.current = null;
    } catch {}
    keepAliveStartedRef.current = false;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }, []);

  // ===== Wake Lock =====
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    try { wakeLockRef.current?.release(); } catch {}
    wakeLockRef.current = null;
  }, []);

  // ===== AudioContext for beeps =====
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AC();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // ===== Google Timer Beep Synthesis =====
  const playBeepPattern = useCallback(() => {
    const ctx = getAudioCtx();

    const playSingleBeep = (startTime) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.6, startTime + 0.01);
      gain.gain.setValueAtTime(0.6, startTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.16);
    };

    const playTripleBeep = () => {
      const now = ctx.currentTime;
      playSingleBeep(now);
      playSingleBeep(now + 0.2);
      playSingleBeep(now + 0.4);
    };

    playTripleBeep();
    beepIntervalRef.current = setInterval(playTripleBeep, 1500);
  }, [getAudioCtx]);

  const stopBeeps = useCallback(() => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  }, []);

  // ===== User activation (required for audio on mobile) =====
  useEffect(() => {
    const activate = () => {
      // Resume AudioContext if suspended
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      // Restart silent audio if it was paused by the OS
      if (keepAliveStartedRef.current && silentAudioRef.current?.paused) {
        silentAudioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('touchstart', activate, { passive: true });
    document.addEventListener('click', activate, { passive: true });
    return () => {
      document.removeEventListener('touchstart', activate);
      document.removeEventListener('click', activate);
    };
  }, []);

  // ===== Stop alarm internal =====
  function stopAlarmInternal() {
    stopBeeps();
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    setRinging(false);
    setAlarmMachine(null);
    setAlarmType(null);
    pendingAlarmRef.current = null;
    swMessage({ type: 'STOP_ALARM' });
    if (navigator.vibrate) navigator.vibrate(0);
    // Update MediaSession to show alarm stopped
    if ('mediaSession' in navigator && keepAliveStartedRef.current) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Timer Running',
        artist: 'SpinLnk',
        album: 'Laundry Timer',
      });
    }
  }

  // ===== Cleanup on unmount =====
  useEffect(() => {
    return () => {
      stopBeeps();
      stopSilentAudio();
      releaseWakeLock();
      if (timerCheckerRef.current) clearInterval(timerCheckerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      try { audioCtxRef.current?.close(); } catch {}
      swMessage({ type: 'CLEAR_ALL_TIMERS' });
    };
  }, [stopBeeps, stopSilentAudio, releaseWakeLock]);

  // ===== Listen for SW messages =====
  useEffect(() => {
    const handler = (event) => {
      const { type, data } = event.data || {};
      if (type === 'STOP_ALARM_FROM_NOTIFICATION') {
        stopAlarmInternal();
      }
      if (type === 'ALARM_FIRED' && data) {
        fireAlarm(data.machineName, data.alarmType, data.hostelId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  // ===== Core alarm trigger =====
  function fireAlarm(machineName, type, hostelId) {
    if (ringing || beepIntervalRef.current) return;

    setRinging(true);
    setAlarmMachine(machineName);
    setAlarmType(type);

    // Update MediaSession to show alarm
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: type === 'queue' ? 'Your Turn!' : "Time's Up!",
        artist: machineName,
        album: 'SpinLnk Alarm',
      });
    }

    playBeepPattern();

    if (navigator.vibrate) {
      navigator.vibrate([1000, 300, 1000, 300, 1000, 300, 1000, 300, 1000]);
    }

    autoStopRef.current = setTimeout(() => stopAlarmInternal(), 30000);
  }

  // ===== Play alarm (public) =====
  const playAlarm = useCallback((machineName, type, hostelId) => {
    if (ringing) return;

    fireAlarm(machineName, type, hostelId);

    const title = type === 'queue' ? 'Your Turn!' : "Time's Up!";
    const body = type === 'queue'
      ? `${machineName} — Go grab the machine now!`
      : `${machineName} has finished. Collect your clothes!`;
    showSystemNotification(title, body, type, hostelId);
  }, [ringing]);

  // ===== Stop alarm (public) =====
  const stopAlarm = useCallback(() => {
    stopAlarmInternal();
  }, []);

  // ===== Register timer with Service Worker =====
  const registerTimerWithSW = useCallback((timerId, endTime, machineName, alarmType, hostelId) => {
    if (registeredTimersRef.current.has(timerId)) return;
    registeredTimersRef.current.add(timerId);
    swMessage({
      type: 'REGISTER_TIMER',
      data: { timerId, endTime, machineName, alarmType, hostelId },
    });
  }, []);

  // ===== In-tab timer checker =====
  const setupTimerChecker = useCallback((machines, currentUserName) => {
    if (timerCheckerRef.current) clearInterval(timerCheckerRef.current);
    if (!machines || !currentUserName) return;
    const lowerUser = currentUserName.toLowerCase();

    let targetEndTime = null;
    let targetMachineName = null;
    let targetType = null;
    let targetHostelId = null;

    for (const m of machines) {
      if (m.status !== 'in-use' || !m.end_time) continue;
      if (m.user_name?.toLowerCase() === lowerUser) {
        if (!targetEndTime || m.end_time < targetEndTime) {
          targetEndTime = m.end_time;
          targetMachineName = m.name || `Machine ${m.machine_key}`;
          targetType = 'session';
          targetHostelId = m.hostel_id;
        }
      }
      const queue = m.queue_members || [];
      const inQueue = queue.some(q => q.name?.toLowerCase() === lowerUser);
      if (inQueue && (!targetEndTime || m.end_time < targetEndTime)) {
        const pos = queue.findIndex(q => q.name?.toLowerCase() === lowerUser);
        targetEndTime = m.end_time;
        targetMachineName = pos === 0
          ? `${m.name} is free — it's your turn!`
          : `${m.name} is free — you're #${pos + 1} in queue`;
        targetType = 'queue';
        targetHostelId = m.hostel_id;
      }
    }

    if (targetEndTime) {
      pendingAlarmRef.current = { endTime: targetEndTime, name: targetMachineName, type: targetType, hostelId: targetHostelId };
      // Check every 2 seconds — silent audio keeps this interval alive on locked screen
      timerCheckerRef.current = setInterval(() => {
        const pending = pendingAlarmRef.current;
        if (pending && Date.now() >= pending.endTime) {
          clearInterval(timerCheckerRef.current);
          timerCheckerRef.current = null;
          playAlarm(pending.name, pending.type, pending.hostelId);
          pendingAlarmRef.current = null;
        }
      }, 2000);
    }
  }, [playAlarm]);

  // ===== Main check function =====
  const checkAlarm = useCallback((machines, currentUserName) => {
    if (!machines || !currentUserName) return;
    const prev = prevMachinesRef.current;
    prevMachinesRef.current = machines;
    const lowerUser = currentUserName.toLowerCase();
    const now = Date.now();

    const hasActiveBooking = machines.some(m =>
      m.status === 'in-use' && m.end_time && now < m.end_time &&
      m.user_name?.toLowerCase() === lowerUser
    );
    const isInAnyQueue = machines.some(m =>
      (m.queue_members || []).some(q => q.name?.toLowerCase() === lowerUser)
    );

    // Register timers with Service Worker (backup for when page is killed)
    for (const m of machines) {
      if (m.status !== 'in-use' || !m.end_time || now >= m.end_time) continue;

      if (m.user_name?.toLowerCase() === lowerUser) {
        const timerId = `session_${m.machine_key}`;
        registerTimerWithSW(timerId, m.end_time, m.name || `Machine ${m.machine_key}`, 'session', m.hostel_id);
      }

      const queue = m.queue_members || [];
      const qIdx = queue.findIndex(q => q.name?.toLowerCase() === lowerUser);
      if (qIdx >= 0) {
        const label = qIdx === 0
          ? `${m.name} is free — it's your turn!`
          : `${m.name} is free — you're #${qIdx + 1} in queue`;
        const timerId = `queue_${m.machine_key}_${lowerUser}`;
        registerTimerWithSW(timerId, m.end_time, label, 'queue', m.hostel_id);
      }
    }

    // Start/stop keep-alive (silent audio + wake lock)
    if ((hasActiveBooking || isInAnyQueue) && !ringing) {
      startSilentAudio();
      requestWakeLock();
      setKeepAliveActive(true);
      setupTimerChecker(machines, currentUserName);
    } else if (!hasActiveBooking && !isInAnyQueue && !ringing) {
      stopSilentAudio();
      releaseWakeLock();
      setKeepAliveActive(false);
      if (timerCheckerRef.current) {
        clearInterval(timerCheckerRef.current);
        timerCheckerRef.current = null;
      }
    }

    // Check queue alert flags
    for (const m of machines) {
      const alertKey = `spinlnk_queue_alert_${m.hostel_id || ''}_${m.machine_key}`;
      const raw = localStorage.getItem(alertKey);
      if (!raw) continue;
      try {
        const alert = JSON.parse(raw);
        if (now - alert.freedAt > 60000) { localStorage.removeItem(alertKey); continue; }
        if (alert.queueMembers.some(name => name.toLowerCase() === lowerUser)) {
          localStorage.removeItem(alertKey);
          const pos = alert.queueMembers.findIndex(name => name.toLowerCase() === lowerUser);
          const label = pos === 0
            ? `${alert.machineName} is free — it's your turn!`
            : `${alert.machineName} is free — you're #${pos + 1} in queue`;
          playAlarm(label, 'queue', m.hostel_id);
          return;
        }
      } catch { localStorage.removeItem(alertKey); }
    }

    if (!prev) return;

    for (const m of machines) {
      const prevM = prev.find(p => p.machine_key === m.machine_key);
      if (!prevM) continue;

      const wasInUse = prevM.status === 'in-use';
      const nowFree = m.status === 'free' || (m.status === 'in-use' && m.end_time && now >= m.end_time);
      if (!(wasInUse && nowFree)) continue;

      swMessage({ type: 'CLEAR_TIMER', data: { timerId: `session_${m.machine_key}` } });
      registeredTimersRef.current.delete(`session_${m.machine_key}`);

      if (prevM.user_name?.toLowerCase() === lowerUser) {
        playAlarm(prevM.name || `Machine ${prevM.machine_key}`, 'session', m.hostel_id);
        return;
      }

      const queue = prevM.queue_members || [];
      const inQueue = queue.some(q => q.name?.toLowerCase() === lowerUser);
      if (inQueue) {
        const pos = queue.findIndex(q => q.name?.toLowerCase() === lowerUser);
        const label = pos === 0
          ? `${m.name} is free — it's your turn!`
          : `${m.name} is free — you're #${pos + 1} in queue`;
        playAlarm(label, 'queue', m.hostel_id);
        return;
      }
    }
  }, [playAlarm, ringing, startSilentAudio, stopSilentAudio, requestWakeLock, releaseWakeLock, setupTimerChecker, registerTimerWithSW]);

  return { ringing, alarmMachine, alarmType, keepAliveActive, stopAlarm, checkAlarm };
}
