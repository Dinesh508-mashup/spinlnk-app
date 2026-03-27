import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import { getWashHistory, addWashHistory } from '../lib/supabase';
import '../styles/Home.css';

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
  const { machines, loading: machinesLoading, freeMachine, extendTime, verifyAccessCode } = useMachines(hostelId);
  const [toast, setToast] = useState('');
  const [codePrompt, setCodePrompt] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [movedPrompt, setMovedPrompt] = useState(null); // { machineKey }
  const [movedName, setMovedName] = useState('');
  const [history, setHistory] = useState([]);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleDoneEarly = (machineKey) => {
    const machine = machines.find(m => m.machine_key === machineKey);
    if (machine && machine.access_code) {
      setCodePrompt({ machineKey });
      setCodeInput('');
      setCodeError('');
    } else {
      freeMachine(machineKey);
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
    await freeMachine(movedPrompt.machineKey);
    setMovedPrompt(null);
    showToast(`${movedName.trim()} moved the clothes`);
    getWashHistory(hostelId).then(setHistory).catch(() => {});
  };

  const handleCodeSubmit = () => {
    if (!codePrompt) return;
    if (verifyAccessCode(codePrompt.machineKey, codeInput)) {
      freeMachine(codePrompt.machineKey);
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
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">📋</span>
          <div>
            <h1 className="app-title">SpinLnk</h1>
            <p className="app-subtitle">{hostelName}</p>
          </div>
        </div>
      </header>

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
                      <span className="machine-emoji">🫧</span>
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
        <button className="nav-item" onClick={() => navigate(`/${param}`)}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button className="nav-item active" onClick={() => navigate(`/lineup${param}`)}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">Line-Up</span>
        </button>
      </nav>
    </div>
  );
}
