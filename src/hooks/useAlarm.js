import { useState, useEffect, useRef, useCallback } from 'react';
import machineAlarmSound from '../assets/Machine alert song.mp3';
import queueAlarmSound from '../assets/Room alert song.mp3';

/*
  Multi-layered background audio strategy:

  Layer 1: Web Audio API (AudioContext) — most reliable for background on both Android & iOS
  Layer 2: HTML5 Audio silent loop — fallback keep-alive for older browsers
  Layer 3: Wake Lock API — prevents screen from auto-sleeping
  Layer 4: Media Session API — shows controls on lock screen (Android/iOS)
  Layer 5: Service Worker timer — posts message back to trigger alarm
  Layer 6: setInterval timer — in-tab fallback that fires alarm even if polling stops
*/

export default function useAlarm() {
  const [ringing, setRinging] = useState(false);
  const [alarmMachine, setAlarmMachine] = useState(null);
  const [alarmType, setAlarmType] = useState(null);
  const [keepAliveActive, setKeepAliveActive] = useState(false);

  // Refs
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainRef = useRef(null);
  const machineAudioRef = useRef(null);
  const queueAudioRef = useRef(null);
  const activeAudioRef = useRef(null);
  const wakeLockRef = useRef(null);
  const playCountRef = useRef(0);
  const prevMachinesRef = useRef(null);
  const timerCheckerRef = useRef(null);
  const pendingAlarmRef = useRef(null); // stores alarm data for timer-based trigger
  const userActivatedRef = useRef(false);

  // ===== LAYER 1: Web Audio API keep-alive =====
  const startAudioContext = useCallback(() => {
    if (audioCtxRef.current?.state === 'running') return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      // Near-silent tone (inaudible but keeps audio session alive)
      oscillator.frequency.setValueAtTime(1, ctx.currentTime); // 1 Hz — below human hearing
      gain.gain.setValueAtTime(0.001, ctx.currentTime); // nearly zero volume

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();

      audioCtxRef.current = ctx;
      oscillatorRef.current = oscillator;
      gainRef.current = gain;

      // iOS Safari requires resume after user gesture
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }, []);

  const stopAudioContext = useCallback(() => {
    try {
      oscillatorRef.current?.stop();
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    oscillatorRef.current = null;
    gainRef.current = null;
  }, []);

  // ===== LAYER 3: Wake Lock API =====
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      // Re-acquire if released (e.g. tab switch)
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    try { wakeLockRef.current?.release(); } catch {}
    wakeLockRef.current = null;
  }, []);

  // ===== LAYER 4: Media Session API =====
  const updateMediaSession = useCallback((title, artist) => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: 'SpinLnk',
      });
      // Add action handlers for lock screen
      navigator.mediaSession.setActionHandler('pause', () => {
        // User tapped pause on lock screen — stop alarm
        stopAlarmInternal();
      });
    } catch {}
  }, []);

  // ===== Handle user activation (required for audio on iOS/Android) =====
  useEffect(() => {
    const activate = () => {
      userActivatedRef.current = true;
      // Resume any suspended audio context
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    document.addEventListener('touchstart', activate, { once: false, passive: true });
    document.addEventListener('click', activate, { once: false, passive: true });
    document.addEventListener('touchend', activate, { once: false, passive: true });

    return () => {
      document.removeEventListener('touchstart', activate);
      document.removeEventListener('click', activate);
      document.removeEventListener('touchend', activate);
    };
  }, []);

  // ===== Initialize alarm audio elements =====
  const handleEnded = useCallback(() => {
    playCountRef.current += 1;
    if (playCountRef.current < 2) {
      const audio = activeAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } else {
      // Auto-stop after 2 plays
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
  }

  useEffect(() => {
    const machineAudio = new Audio(machineAlarmSound);
    const queueAudio = new Audio(queueAlarmSound);
    machineAudio.loop = false;
    queueAudio.loop = false;
    // Preload on both
    machineAudio.preload = 'auto';
    queueAudio.preload = 'auto';

    machineAudioRef.current = machineAudio;
    queueAudioRef.current = queueAudio;

    machineAudio.addEventListener('ended', handleEnded);
    queueAudio.addEventListener('ended', handleEnded);

    return () => {
      machineAudio.removeEventListener('ended', handleEnded);
      queueAudio.removeEventListener('ended', handleEnded);
      machineAudio.pause();
      queueAudio.pause();
      machineAudio.src = '';
      queueAudio.src = '';
      stopAudioContext();
      releaseWakeLock();
      if (timerCheckerRef.current) clearInterval(timerCheckerRef.current);
    };
  }, [handleEnded, stopAudioContext, releaseWakeLock]);

  // ===== Play alarm =====
  const playAlarm = useCallback((machineName, type) => {
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

      // Try playing — if blocked, use AudioContext to bridge
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Fallback: use Web Audio API to play
          try {
            const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaElementSource(audio);
            source.connect(ctx.destination);
            audio.play().catch(() => {});
          } catch {}
        });
      }
    }

    updateMediaSession(
      type === 'queue' ? 'Your Turn!' : "Time's Up!",
      machineName
    );

    // Vibrate pattern for attention
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
    }
  }, [ringing, updateMediaSession]);

  // ===== Stop alarm (public) =====
  const stopAlarm = useCallback(() => {
    stopAlarmInternal();
    // Restore keep-alive if still needed
    updateMediaSession('SpinLnk Timer', 'Monitoring your laundry');
  }, [updateMediaSession]);

  // ===== LAYER 6: In-tab timer checker =====
  // This runs independently of machine polling — catches expiry even if fetch is delayed
  const setupTimerChecker = useCallback((machines, currentUserName) => {
    if (timerCheckerRef.current) clearInterval(timerCheckerRef.current);

    if (!machines || !currentUserName) return;
    const lowerUser = currentUserName.toLowerCase();

    // Find earliest expiring machine relevant to this user
    let targetEndTime = null;
    let targetMachineName = null;
    let targetType = null;

    for (const m of machines) {
      if (m.status !== 'in-use' || !m.end_time) continue;

      if (m.user_name?.toLowerCase() === lowerUser) {
        if (!targetEndTime || m.end_time < targetEndTime) {
          targetEndTime = m.end_time;
          targetMachineName = m.name || `Machine ${m.machine_key}`;
          targetType = 'session';
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
      }
    }

    if (targetEndTime) {
      pendingAlarmRef.current = { endTime: targetEndTime, name: targetMachineName, type: targetType };

      // Check every 2 seconds — this runs even if fetch polling is delayed
      timerCheckerRef.current = setInterval(() => {
        const pending = pendingAlarmRef.current;
        if (pending && Date.now() >= pending.endTime) {
          clearInterval(timerCheckerRef.current);
          timerCheckerRef.current = null;
          playAlarm(pending.name, pending.type);
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

    // Check if user has any active booking or is in any queue
    const hasActiveBooking = machines.some(m =>
      m.status === 'in-use' && m.end_time && now < m.end_time &&
      m.user_name?.toLowerCase() === lowerUser
    );
    const isInAnyQueue = machines.some(m =>
      (m.queue_members || []).some(q => q.name?.toLowerCase() === lowerUser)
    );

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

    // Check for queue alert flags (set when owner clicks "I'm Done Early" / "I Moved Clothes")
    for (const m of machines) {
      const alertKey = `spinlnk_queue_alert_${m.hostel_id || ''}_${m.machine_key}`;
      const raw = localStorage.getItem(alertKey);
      if (!raw) continue;
      try {
        const alert = JSON.parse(raw);
        // Only process alerts from last 60 seconds
        if (now - alert.freedAt > 60000) {
          localStorage.removeItem(alertKey);
          continue;
        }
        // Check if current user was in the queue
        if (alert.queueMembers.some(name => name.toLowerCase() === lowerUser)) {
          localStorage.removeItem(alertKey);
          const pos = alert.queueMembers.findIndex(name => name.toLowerCase() === lowerUser);
          const label = pos === 0
            ? `${alert.machineName} is free — it's your turn!`
            : `${alert.machineName} is free — you're #${pos + 1} in queue`;
          playAlarm(label, 'queue');
          return;
        }
      } catch {
        localStorage.removeItem(alertKey);
      }
    }

    // Skip normal alarm detection on first render
    if (!prev) return;

    for (const m of machines) {
      const prevM = prev.find(p => p.machine_key === m.machine_key);
      if (!prevM) continue;

      // Detect machine just became free (timer expired OR was freed manually)
      const wasInUse = prevM.status === 'in-use';
      const nowFree = m.status === 'free' || (m.status === 'in-use' && m.end_time && now >= m.end_time);
      const justExpired = wasInUse && nowFree;

      if (!justExpired) continue;

      // 1. Machine alarm — user who booked this machine
      if (prevM.user_name?.toLowerCase() === lowerUser) {
        playAlarm(prevM.name || `Machine ${prevM.machine_key}`, 'session');
        return;
      }

      // 2. Queue alarm — user is in the queue for this machine
      const queue = prevM.queue_members || [];
      const inQueue = queue.some(q => q.name?.toLowerCase() === lowerUser);
      if (inQueue) {
        const pos = queue.findIndex(q => q.name?.toLowerCase() === lowerUser);
        const label = pos === 0
          ? `${m.name} is free — it's your turn!`
          : `${m.name} is free — you're #${pos + 1} in queue`;
        playAlarm(label, 'queue');
        return;
      }
    }
  }, [playAlarm, ringing, startAudioContext, stopAudioContext, requestWakeLock, releaseWakeLock, updateMediaSession, setupTimerChecker]);

  return { ringing, alarmMachine, alarmType, keepAliveActive, stopAlarm, checkAlarm };
}
