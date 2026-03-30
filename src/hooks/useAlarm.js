import { useState, useEffect, useRef, useCallback } from 'react';
import machineAlarmSound from '../assets/Machine alert song.mp3';
import queueAlarmSound from '../assets/Room alert song.mp3';

/*
  Alarm system with background notification support:

  1. Web Audio API (AudioContext) — keeps audio session alive in background
  2. Service Worker timers — fires system notifications even when phone is locked
  3. Wake Lock API — prevents screen from sleeping
  4. Media Session API — lock screen controls
  5. Amplified audio via GainNode — overrides low/silent volume
  6. System notifications — clickable, works on lock screen
*/

// Helper: send message to service worker
function swMessage(msg) {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

// Helper: show system notification from the page (works in background tabs)
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

  // Refs
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const machineAudioRef = useRef(null);
  const queueAudioRef = useRef(null);
  const activeAudioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const playCountRef = useRef(0);
  const prevMachinesRef = useRef(null);
  const timerCheckerRef = useRef(null);
  const pendingAlarmRef = useRef(null);
  const userActivatedRef = useRef(false);
  const registeredTimersRef = useRef(new Set());

  // Amplified audio refs
  const alarmCtxRef = useRef(null);
  const machineGainRef = useRef(null);
  const queueGainRef = useRef(null);
  const connectedRef = useRef(false);

  // ===== Web Audio API keep-alive =====
  const startAudioContext = useCallback(() => {
    if (audioCtxRef.current?.state === 'running') return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(1, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      audioCtxRef.current = ctx;
      oscillatorRef.current = osc;
      if (ctx.state === 'suspended') ctx.resume();
    } catch {}
  }, []);

  const stopAudioContext = useCallback(() => {
    try { oscillatorRef.current?.stop(); audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    oscillatorRef.current = null;
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

  // ===== Media Session =====
  const updateMediaSession = useCallback((title, artist) => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: 'SpinLnk' });
      navigator.mediaSession.setActionHandler('pause', () => stopAlarmInternal());
    } catch {}
  }, []);

  // ===== Connect amplified audio (once on first user gesture) =====
  const connectAmplifiedAudio = useCallback(() => {
    if (connectedRef.current) return;
    const machine = machineAudioRef.current;
    const queue = queueAudioRef.current;
    if (!machine || !queue) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      alarmCtxRef.current = ctx;

      const ms = ctx.createMediaElementSource(machine);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(3.0, ctx.currentTime);
      ms.connect(mg);
      mg.connect(ctx.destination);
      machineGainRef.current = mg;

      const qs = ctx.createMediaElementSource(queue);
      const qg = ctx.createGain();
      qg.gain.setValueAtTime(3.0, ctx.currentTime);
      qs.connect(qg);
      qg.connect(ctx.destination);
      queueGainRef.current = qg;

      connectedRef.current = true;
    } catch (e) {
      console.warn('Amplified audio setup failed:', e);
    }
  }, []);

  // ===== User activation handler =====
  useEffect(() => {
    const activate = () => {
      userActivatedRef.current = true;
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      if (alarmCtxRef.current?.state === 'suspended') alarmCtxRef.current.resume();
      connectAmplifiedAudio();
    };
    document.addEventListener('touchstart', activate, { passive: true });
    document.addEventListener('click', activate, { passive: true });
    return () => {
      document.removeEventListener('touchstart', activate);
      document.removeEventListener('click', activate);
    };
  }, [connectAmplifiedAudio]);

  // ===== Audio elements init =====
  const handleEnded = useCallback(() => {
    playCountRef.current += 1;
    if (playCountRef.current < 3) {
      const audio = activeAudioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    } else {
      stopAlarmInternal();
    }
  }, []);

  function stopAlarmInternal() {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
    }
    activeAudioRef.current = null;
    playCountRef.current = 0;
    setRinging(false);
    setAlarmMachine(null);
    setAlarmType(null);
    pendingAlarmRef.current = null;
    // Tell SW to close notification
    swMessage({ type: 'STOP_ALARM' });
    // Stop vibration
    if (navigator.vibrate) navigator.vibrate(0);
  }

  useEffect(() => {
    const ma = new Audio(machineAlarmSound);
    const qa = new Audio(queueAlarmSound);
    ma.loop = false; qa.loop = false;
    ma.preload = 'auto'; qa.preload = 'auto';
    machineAudioRef.current = ma;
    queueAudioRef.current = qa;
    ma.addEventListener('ended', handleEnded);
    qa.addEventListener('ended', handleEnded);

    return () => {
      ma.removeEventListener('ended', handleEnded);
      qa.removeEventListener('ended', handleEnded);
      ma.pause(); qa.pause();
      ma.src = ''; qa.src = '';
      stopAudioContext();
      releaseWakeLock();
      if (timerCheckerRef.current) clearInterval(timerCheckerRef.current);
      try { alarmCtxRef.current?.close(); } catch {}
      swMessage({ type: 'CLEAR_ALL_TIMERS' });
    };
  }, [handleEnded, stopAudioContext, releaseWakeLock]);

  // ===== Listen for SW messages (alarm fired / stop from notification click) =====
  useEffect(() => {
    const handler = (event) => {
      const { type, data } = event.data || {};
      if (type === 'STOP_ALARM_FROM_NOTIFICATION') {
        stopAlarmInternal();
      }
      if (type === 'ALARM_FIRED' && data) {
        // SW timer expired — fire in-app alarm
        playAlarmDirect(data.machineName, data.alarmType);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  // Direct play without ringing guard (called from SW message)
  function playAlarmDirect(machineName, type) {
    if (activeAudioRef.current) return; // already playing
    playCountRef.current = 0;
    setRinging(true);
    setAlarmMachine(machineName);
    setAlarmType(type);

    const audio = type === 'queue' ? queueAudioRef.current : machineAudioRef.current;
    activeAudioRef.current = audio;
    if (audio) {
      audio.volume = 1.0;
      audio.currentTime = 0;
      connectAmplifiedAudio();
      if (alarmCtxRef.current?.state === 'suspended') alarmCtxRef.current.resume();
      const gain = type === 'queue' ? queueGainRef.current : machineGainRef.current;
      if (gain && alarmCtxRef.current) gain.gain.setValueAtTime(3.0, alarmCtxRef.current.currentTime);
      audio.play().catch(() => {});
    }
    updateMediaSession(type === 'queue' ? 'Your Turn!' : "Time's Up!", machineName);
    if (navigator.vibrate) navigator.vibrate([1000, 300, 1000, 300, 1000, 300, 1000, 300, 1000]);
  }

  // ===== Play alarm =====
  const playAlarm = useCallback((machineName, type, hostelId) => {
    if (ringing) return;

    playCountRef.current = 0;
    setRinging(true);
    setAlarmMachine(machineName);
    setAlarmType(type);

    const audio = type === 'queue' ? queueAudioRef.current : machineAudioRef.current;
    activeAudioRef.current = audio;

    if (audio) {
      audio.volume = 1.0;
      audio.currentTime = 0;
      connectAmplifiedAudio();
      if (alarmCtxRef.current?.state === 'suspended') alarmCtxRef.current.resume();
      const gain = type === 'queue' ? queueGainRef.current : machineGainRef.current;
      if (gain && alarmCtxRef.current) gain.gain.setValueAtTime(3.0, alarmCtxRef.current.currentTime);
      audio.play().catch(() => {
        try { if (alarmCtxRef.current) alarmCtxRef.current.resume(); audio.play().catch(() => {}); } catch {}
      });
    }

    updateMediaSession(
      type === 'queue' ? 'Your Turn!' : "Time's Up!",
      machineName
    );

    // System notification (visible on lock screen, clickable)
    const title = type === 'queue' ? 'Your Turn!' : "Time's Up!";
    const body = type === 'queue'
      ? `${machineName} — Go grab the machine now!`
      : `${machineName} has finished. Collect your clothes!`;
    showSystemNotification(title, body, type, hostelId);

    // Aggressive vibration
    if (navigator.vibrate) {
      navigator.vibrate([1000, 300, 1000, 300, 1000, 300, 1000, 300, 1000]);
    }
  }, [ringing, updateMediaSession, connectAmplifiedAudio]);

  // ===== Stop alarm (public) =====
  const stopAlarm = useCallback(() => {
    stopAlarmInternal();
    updateMediaSession('SpinLnk Timer', 'Monitoring your laundry');
  }, [updateMediaSession]);

  // ===== Register timer with Service Worker =====
  const registerTimerWithSW = useCallback((timerId, endTime, machineName, alarmType, hostelId) => {
    if (registeredTimersRef.current.has(timerId)) return;
    registeredTimersRef.current.add(timerId);
    swMessage({
      type: 'REGISTER_TIMER',
      data: { timerId, endTime, machineName, alarmType, hostelId },
    });
  }, []);

  // ===== In-tab timer checker (backup for when SW timer doesn't fire) =====
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
      timerCheckerRef.current = setInterval(() => {
        const pending = pendingAlarmRef.current;
        if (pending && Date.now() >= pending.endTime) {
          clearInterval(timerCheckerRef.current);
          timerCheckerRef.current = null;
          playAlarm(pending.name, pending.type, pending.hostelId);
          pendingAlarmRef.current = null;
        }
      }, 3000);
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

    // Register timers with Service Worker for background notifications
    for (const m of machines) {
      if (m.status !== 'in-use' || !m.end_time || now >= m.end_time) continue;

      // Register for machine owner
      if (m.user_name?.toLowerCase() === lowerUser) {
        const timerId = `session_${m.machine_key}`;
        registerTimerWithSW(timerId, m.end_time, m.name || `Machine ${m.machine_key}`, 'session', m.hostel_id);
      }

      // Register for queue members
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

    // Start/stop keep-alive layers
    if ((hasActiveBooking || isInAnyQueue) && !ringing) {
      startAudioContext();
      requestWakeLock();
      updateMediaSession('SpinLnk Timer', 'Monitoring your laundry');
      setKeepAliveActive(true);
      setupTimerChecker(machines, currentUserName);
    } else if (!hasActiveBooking && !isInAnyQueue && !ringing) {
      stopAudioContext();
      releaseWakeLock();
      setKeepAliveActive(false);
      if (timerCheckerRef.current) {
        clearInterval(timerCheckerRef.current);
        timerCheckerRef.current = null;
      }
    }

    // Check queue alert flags (from "I'm Done Early" / "I Moved Clothes")
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

    // Skip normal detection on first render
    if (!prev) return;

    for (const m of machines) {
      const prevM = prev.find(p => p.machine_key === m.machine_key);
      if (!prevM) continue;

      const wasInUse = prevM.status === 'in-use';
      const nowFree = m.status === 'free' || (m.status === 'in-use' && m.end_time && now >= m.end_time);
      if (!(wasInUse && nowFree)) continue;

      // Clear SW timer since it fired
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
  }, [playAlarm, ringing, startAudioContext, stopAudioContext, requestWakeLock, releaseWakeLock, updateMediaSession, setupTimerChecker, registerTimerWithSW]);

  return { ringing, alarmMachine, alarmType, keepAliveActive, stopAlarm, checkAlarm };
}
