import { useState, useEffect, useMemo } from 'react';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import { joinQueue, leaveQueue } from '../lib/supabase';
import NameModal from '../components/NameModal';
import '../styles/Queue.css';

function formatMinsLeft(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 60000));
}

export default function Queue() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading, refresh } = useMachines(hostelId);
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingMachine, setPendingMachine] = useState(null);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(Date.now());

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const userName = localStorage.getItem('userName') || '';

  // Tick every second for timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute machine statuses using `now` (reactive)
  const machineStatuses = useMemo(() => {
    return machines.map(m => ({
      ...m,
      isFree: m.status !== 'in-use' || !m.end_time || now >= m.end_time,
      minsLeft: m.end_time ? formatMinsLeft(m.end_time) : 0,
    }));
  }, [machines, now]);

  if (hostelLoading || machinesLoading) {
    return <div className="app-container"><p className="loading">Loading...</p></div>;
  }
  if (hostelError) {
    return <div className="app-container"><p className="error-msg">{hostelError}</p></div>;
  }

  const handleJoin = async (machineKey) => {
    if (!userName) {
      setPendingMachine(machineKey);
      setShowNameModal(true);
      return;
    }
    try {
      const queue = await joinQueue(hostelId, machineKey, userName, localStorage.getItem('userRoom') || '');
      const pos = queue.findIndex(q => q.name === userName) + 1;
      showToast(`You're #${pos} in queue for Machine ${machineKey}!`);
      refresh();
    } catch {
      showToast('Failed to join queue.');
    }
  };

  const handleLeave = async (machineKey) => {
    try {
      await leaveQueue(hostelId, machineKey, userName);
      showToast('You left the queue.');
      refresh();
    } catch {
      showToast('Failed to leave queue.');
    }
  };

  const handleNameSave = async (name, room) => {
    localStorage.setItem('userName', name);
    localStorage.setItem('userRoom', room);
    setShowNameModal(false);
    if (pendingMachine) {
      try {
        const queue = await joinQueue(hostelId, pendingMachine, name, room);
        const pos = queue.findIndex(q => q.name === name) + 1;
        showToast(`You're #${pos} in queue for Machine ${pendingMachine}!`);
        refresh();
      } catch {
        showToast('Failed to join queue.');
      }
    }
  };

  const inUseMachines = machineStatuses.filter(m => !m.isFree);
  const freeMachines = machineStatuses.filter(m => m.isFree);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">📡</span>
          <div>
            <h1 className="app-title">SpinLnk</h1>
            <p className="app-subtitle">{hostelName}</p>
          </div>
        </div>
      </header>

      <div className="content">
        {machines.length === 0 ? (
          <p className="empty-state">No machines set up yet.</p>
        ) : (
          <>
            {/* In-use machines with queue */}
            {inUseMachines.map(m => {
              const queue = m.queue_members || [];
              const isInQueue = queue.some(q => q.name === userName);

              return (
                <div key={m.machine_key} className="queue-card">
                  <div className="queue-card-header">
                    <h3>Queue — {m.name}</h3>
                    <span className="status-badge in-use">
                      IN USE — {m.minsLeft} min left
                    </span>
                  </div>
                  <p className="queue-reserved">
                    Reserved by {m.user_name}{m.room ? ` • Room ${m.room}` : ''} • {m.cycle} cycle
                  </p>

                  {queue.length > 0 ? (
                    <div className="queue-list">
                      <p className="queue-count">{queue.length} in queue</p>
                      {queue.map((q, i) => (
                        <div key={i} className="queue-person">
                          <div className="queue-avatar">{q.name.charAt(0).toUpperCase()}</div>
                          <div className="queue-person-info">
                            <span className="queue-person-name">{q.name}</span>
                            <span className="queue-person-detail">{q.room ? `Room ${q.room}` : ''}</span>
                          </div>
                          <span className="queue-position">#{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="queue-empty">No one in queue yet. Be the first!</p>
                  )}

                  {isInQueue ? (
                    <button className="btn btn-leave" onClick={() => handleLeave(m.machine_key)}>Leave Queue</button>
                  ) : (
                    <button className="btn btn-join" onClick={() => handleJoin(m.machine_key)}>Join Queue</button>
                  )}
                </div>
              );
            })}

            {/* Free machines */}
            {freeMachines.map(m => (
              <div key={m.machine_key} className="queue-card free-card">
                <div className="queue-card-header">
                  <div>
                    <span className="status-badge free">AVAILABLE</span>
                    <h3>{m.name}</h3>
                    <p className="queue-sub">Ready for your laundry load</p>
                  </div>
                  <span className="machine-emoji">🫧</span>
                </div>
                <div className="scan-hint">
                  <span>📷</span> Scan the QR code on the machine to book
                </div>
              </div>
            ))}

            {/* All free message */}
            {inUseMachines.length === 0 && (
              <div className="all-free-msg">
                <span>🎉</span>
                <h3>All machines are free!</h3>
                <p>No need to queue — scan a machine QR to start a wash.</p>
              </div>
            )}

            {/* Recommended slots */}
            <div className="recommended-section">
              <h3 className="recommended-title">Recommended Slots</h3>
              <div className="recommended-slot">
                <div className="slot-icon">☀️</div>
                <div className="slot-info">
                  <span className="slot-time">Tomorrow, 09:30 AM</span>
                  <span className="slot-detail">Predicted lowest traffic</span>
                </div>
              </div>
              <div className="recommended-slot">
                <div className="slot-icon">🌙</div>
                <div className="slot-info">
                  <span className="slot-time">Tonight, 11:00 PM</span>
                  <span className="slot-detail">Available now</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && <div className="toast show">{toast}</div>}
      {showNameModal && <NameModal onSave={handleNameSave} onClose={() => setShowNameModal(false)} />}
    </div>
  );
}
