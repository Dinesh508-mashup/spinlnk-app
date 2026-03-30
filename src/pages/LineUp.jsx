import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import useNotifications from '../hooks/useNotifications';
import useAlarm from '../hooks/useAlarm';
import NotificationPanel from '../components/NotificationPanel';
import AlarmOverlay from '../components/AlarmOverlay';
import { getWashHistory, addWashHistory, joinQueue, leaveQueue } from '../lib/supabase';
import spinlnkLogo from '../assets/spinlnk-logo.png';
import '../styles/Home.css';
import '../styles/Notifications.css';
import '../styles/Alarm.css';

const RING_RADIUS = 76;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getCycleMinutes(cycleName) {
  const map = { Express: 15, Quick: 30, Normal: 45, Heavy: 60, 'Deep Clean': 90 };
  return map[cycleName] || 45;
}

function formatTime(endTime) {
  const remaining = Math.max(0, endTime - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function LineUp() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading, freeMachine, extendTime, verifyAccessCode, refresh } = useMachines(hostelId);
  const { notifications, unreadCount, markAllRead, clearAll, checkMachineEvents, requestPermission } = useNotifications(hostelId);
  const { ringing, alarmMachine, alarmType, stopAlarm, checkAlarm } = useAlarm();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [toast, setToast] = useState('');
  const userName = localStorage.getItem('userName') || '';

  useEffect(() => { requestPermission(); }, [requestPermission]);
  useEffect(() => { checkMachineEvents(machines, userName); }, [machines, userName, checkMachineEvents]);
  useEffect(() => { checkAlarm(machines, userName); }, [machines, userName, checkAlarm]);
  const [codePrompt, setCodePrompt] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [movedPrompt, setMovedPrompt] = useState(null); // { machineKey }
  const [movedName, setMovedName] = useState('');
  const [history, setHistory] = useState([]);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleJoinQueue = async (machineKey) => {
    if (!userName) { showToast('Set your name first by booking a machine.'); return; }
    try {
      const queue = await joinQueue(hostelId, machineKey, userName, localStorage.getItem('userRoom') || '');
      const pos = queue.findIndex(q => q.name === userName) + 1;
      showToast(`You're #${pos} in queue for Machine ${machineKey}!`);
      refresh();
    } catch (e) {
      showToast('Failed to join queue: ' + (e.message || ''));
    }
  };

  const handleLeaveQueue = async (machineKey) => {
    try {
      await leaveQueue(hostelId, machineKey, userName);
      showToast('You left the queue.');
      refresh();
    } catch (e) {
      showToast('Failed to leave queue: ' + (e.message || ''));
    }
  };

  // Notify queue members before freeing machine
  const notifyQueueAndFree = async (machineKey) => {
    const machine = machines.find(m => m.machine_key === machineKey);
    const queue = machine?.queue_members || [];
    if (queue.length > 0) {
      // Send in-app notification to all queue members
      // They'll see it when their page refreshes and detects the machine is free
      // Store a flag so the alarm hook picks it up on next check
      localStorage.setItem(`spinlnk_queue_alert_${hostelId}_${machineKey}`, JSON.stringify({
        machineName: machine.name,
        queueMembers: queue.map(q => q.name),
        freedAt: Date.now(),
      }));
    }
    await freeMachine(machineKey);
  };

  const handleDoneEarly = (machineKey) => {
    const machine = machines.find(m => m.machine_key === machineKey);
    if (machine && machine.access_code) {
      setCodePrompt({ machineKey });
      setCodeInput('');
      setCodeError('');
    } else {
      notifyQueueAndFree(machineKey);
    }
  };

  // Fetch history
  useEffect(() => {
    if (!hostelId) return;
    getWashHistory(hostelId).then(setHistory).catch(() => {});
    const interval = setInterval(() => {
      getWashHistory(hostelId).then(setHistory).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [hostelId]);

  const handleMovedClothes = (machineKey) => {
    setMovedPrompt({ machineKey });
    setMovedName('');
  };

  const handleMovedSubmit = async () => {
    if (!movedName.trim()) return;
    const machine = machines.find(m => m.machine_key === movedPrompt.machineKey);
    if (machine) {
      await addWashHistory(hostelId, {
        machine_key: machine.machine_key,
        machine_name: machine.name,
        user_name: movedName.trim(),
        room: null,
        cycle: 'Moved clothes',
        duration: null,
        started_at: new Date().toISOString(),
      });
    }
    await notifyQueueAndFree(movedPrompt.machineKey);
    setMovedPrompt(null);
    showToast(`${movedName.trim()} moved the clothes`);
    getWashHistory(hostelId).then(setHistory).catch(() => {});
  };

  const handleCodeSubmit = () => {
    if (!codePrompt) return;
    if (verifyAccessCode(codePrompt.machineKey, codeInput)) {
      notifyQueueAndFree(codePrompt.machineKey);
      setCodePrompt(null);
      showToast('Machine freed!');
    } else {
      setCodeError('Wrong access code. Try again.');
    }
  };
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (hostelLoading || machinesLoading) {
    return <div className="app-container"><p className="loading">Loading...</p></div>;
  }
  if (hostelError) {
    return <div className="app-container"><p className="error-msg">{hostelError}</p></div>;
  }

  const activeMachines = machines.filter(m => m.status === 'in-use' && m.end_time && Date.now() < m.end_time);
  const freeMachinesList = machines.filter(m => m.status !== 'in-use' || !m.end_time || Date.now() >= m.end_time);

  return (
    <div className="app-container has-nav">
      <header className="header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src={spinlnkLogo} alt="SpinLnk" className="header-logo-img" />
        <button className="notif-bell" onClick={() => setShowNotifPanel(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>
      </header>

      {showNotifPanel && (
        <NotificationPanel notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onClearAll={clearAll} onClose={() => setShowNotifPanel(false)} />
      )}

      {ringing && <AlarmOverlay machineName={alarmMachine} alarmType={alarmType} onStop={stopAlarm} />}

      <div className="content">
        {machines.length === 0 ? (
          <p className="empty-state">No machines set up yet.</p>
        ) : activeMachines.length === 0 ? (
          <div className="all-free-banner">
            <span>✅</span>
            <p>All machines are available! Go book one from Home.</p>
          </div>
        ) : (
          <>
            {activeMachines.map(m => {
              const totalMin = getCycleMinutes(m.cycle);
              const remaining = Math.max(0, m.end_time - Date.now());
              const progress = (totalMin * 60 * 1000) > 0 ? Math.max(0, Math.min(1, remaining / (totalMin * 60 * 1000))) : 0;
              const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
              const queue = m.queue_members || [];

              return (
                <div key={m.machine_key} className="booking-card">
                  {/* Header */}
                  <div className="booking-card-header">
                    <span className="status-badge in-use">{m.name} — IN USE</span>
                    <p className="booking-cycle-label">{m.cycle} {totalMin} min</p>
                  </div>

                  {/* Timer ring */}
                  <div className="timer-ring-wrapper">
                    <div className="timer-ring">
                      <svg viewBox="0 0 180 180">
                        <circle className="timer-ring-bg" cx="90" cy="90" r={RING_RADIUS} />
                        <circle
                          className="timer-ring-progress"
                          cx="90" cy="90" r={RING_RADIUS}
                          strokeDasharray={RING_CIRCUMFERENCE}
                          strokeDashoffset={dashOffset}
                        />
                      </svg>
                      <div className="timer-ring-content">
                        <span className="timer-ring-label">Remaining</span>
                        <span className="timer-ring-time">{formatTime(m.end_time)}</span>
                        <span className="timer-ring-user">{m.user_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="booking-actions">
                    <button className="btn btn-done-early" onClick={() => handleDoneEarly(m.machine_key)}>I'm Done Early</button>
                    <button className="btn btn-moved" onClick={() => handleMovedClothes(m.machine_key)}>I Moved the Clothes</button>
                  </div>

                  {/* Snooze / Running Late */}
                  {(() => {
                    const used = m.snooze_count || 0;
                    const left = 3 - used;
                    return (
                      <div className="snooze-section">
                        <p className="snooze-label">Running late?</p>
                        {left > 0 ? (
                          <>
                            <button className="snooze-btn" onClick={async () => {
                              const ok = await extendTime(m.machine_key);
                              if (ok) showToast(`+5 min added (${left - 1} left)`);
                              else showToast('No more extensions');
                            }}>+5 min</button>
                            <p className="snooze-remaining">{left} extension{left !== 1 ? 's' : ''} remaining</p>
                          </>
                        ) : (
                          <p className="snooze-maxed">No extensions remaining</p>
                        )}
                      </div>
                    );
                  })()}

                  <p className="booking-hint">We'll ping you before it ends 👌</p>

                  {/* Queue list (always rendered for smooth transition) */}
                  <div className="lineup-queue-section">
                    {queue.length > 0 ? (
                      <>
                        <p className="lineup-queue-title">{queue.length} waiting in queue</p>
                        {queue.map((q, i) => (
                          <div key={i} className="lineup-queue-person">
                            <div className="lineup-queue-avatar">{q.name.charAt(0).toUpperCase()}</div>
                            <div className="lineup-queue-info">
                              <span className="lineup-queue-name">{q.name}</span>
                              <span className="lineup-queue-detail">{q.room ? `Room ${q.room}` : ''}</span>
                            </div>
                            <span className="lineup-queue-pos">#{i + 1}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="lineup-queue-empty">No one in queue yet</p>
                    )}

                  </div>
                </div>
              );
            })}

            {/* Free machines listed below */}
            {freeMachinesList.length > 0 && (
              <>
                <h2 className="section-title" style={{ marginTop: 20 }}>Available Machines</h2>
                {freeMachinesList.map(m => (
                  <div key={m.machine_key} className="machine-card free" style={{ marginBottom: 12 }}>
                    <div className="machine-card-header">
                      <div className="machine-card-info">
                        <span className="status-badge free">FREE</span>
                        <h3 className="machine-name">{m.name}</h3>
                        <p className="machine-sub">Available now</p>
                      </div>
                      <span className="machine-emoji"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg></span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {/* History Log */}
            {history.length > 0 && (
              <>
                <h2 className="section-title" style={{ marginTop: 24 }}>History</h2>
                <div className="history-log">
                  {history.slice(0, 20).map((h, i) => (
                    <div key={i} className="history-entry">
                      <div className="history-entry-left">
                        <span className="history-machine-name">{h.machine_name}</span>
                        <span className="history-detail">
                          {h.cycle}{h.duration ? ` • ${h.duration} min` : ''} • {h.user_name}
                        </span>
                      </div>
                      <span className="history-time">
                        {new Date(h.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Moved Clothes Modal */}
      {movedPrompt && (
        <div className="modal-overlay" onClick={() => setMovedPrompt(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', fontSize: 32, marginBottom: 8 }}>👕</div>
            <h3>Who moved the clothes?</h3>
            <p>Enter your name so the owner knows who helped.</p>
            <label>YOUR NAME</label>
            <input
              value={movedName}
              onChange={e => setMovedName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              autoFocus
            />
            <button className="btn btn-start" onClick={handleMovedSubmit} style={{ marginTop: 12 }}>Confirm</button>
            <button className="btn btn-cancel" onClick={() => setMovedPrompt(null)} style={{ marginTop: 8 }}>Go Back</button>
          </div>
        </div>
      )}

      {/* Access Code Modal */}
      {codePrompt && (
        <div className="modal-overlay" onClick={() => setCodePrompt(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', fontSize: 32, marginBottom: 8 }}>🔒</div>
            <h3>Enter Access Code</h3>
            <p>Enter the code you set when booking to end early.</p>
            <label>ACCESS CODE</label>
            <input
              type="password"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(''); }}
              placeholder="Enter your code"
              maxLength={6}
              autoFocus
            />
            {codeError && <p className="form-error">{codeError}</p>}
            <button className="btn btn-start" onClick={handleCodeSubmit} style={{ marginTop: 12 }}>Confirm</button>
            <button className="btn btn-cancel" onClick={() => setCodePrompt(null)} style={{ marginTop: 8 }}>Go Back</button>
          </div>
        </div>
      )}

      {toast && <div className="toast show">{toast}</div>}

      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate(`/home${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="#e8594f" strokeWidth="2.5"/><path d="M12 2a10 10 0 0110 10" stroke="#3cc1a2" strokeWidth="3" strokeLinecap="round"/></svg></span>
          <span className="nav-label">Home</span>
        </button>
        <button className="nav-center-btn" onClick={() => navigate(`/home${param}`)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg>
        </button>
        <button className="nav-item active" onClick={() => navigate(`/lineup${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="#3cc1a2" stroke="none"><path d="M16 3.5a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0zM9 5a2.5 2.5 0 015 0A2.5 2.5 0 019 5zM3 6.5a2 2 0 014 0 2 2 0 01-4 0zM14.5 10c-1.5 0-3-.5-4-1.5C9.5 9.5 8 10 6.5 10 4.5 10 2 11 2 13v1.5c0 .5.5 1 1 1h18c.5 0 1-.5 1-1V13c0-2-2.5-3-4.5-3z"/><path d="M5 18h14c.5 0 1 .5 1 1s-.5 1-1 1H5c-.5 0-1-.5-1-1s.5-1 1-1z"/></svg></span>
          <span className="nav-label">Line-Up</span>
        </button>
      </nav>
    </div>
  );
}
