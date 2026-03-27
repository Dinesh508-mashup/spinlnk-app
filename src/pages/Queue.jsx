import { useState } from 'react';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import { joinQueue, leaveQueue } from '../lib/supabase';
import BottomNav from '../components/BottomNav';
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

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const userName = localStorage.getItem('userName') || '';

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
    } catch (e) {
      showToast('Failed to join queue.');
    }
  };

  const handleLeave = async (machineKey) => {
    try {
      await leaveQueue(hostelId, machineKey, userName);
      showToast('You left the queue.');
      refresh();
    } catch (e) {
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
      } catch (e) {
        showToast('Failed to join queue.');
      }
    }
  };

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
        <h2 className="section-title">Live Machine Status</h2>

        {machines.length === 0 ? (
          <p className="empty-state">No machines set up yet.</p>
        ) : (
          machines.map(m => {
            const isFree = m.status === 'free' || (m.status === 'in-use' && m.end_time && Date.now() >= m.end_time);
            const queue = m.queue_members || [];
            const isInQueue = queue.some(q => q.name === userName);

            return (
              <div key={m.machine_key} className="queue-card">
                <div className="queue-card-header">
                  <h3>{m.name}</h3>
                  <span className={`status-badge ${isFree ? 'free' : 'in-use'}`}>
                    {isFree ? 'FREE' : `IN USE — ${formatMinsLeft(m.end_time)} min left`}
                  </span>
                </div>

                {!isFree && (
                  <p className="queue-reserved">
                    Reserved by {m.user_name}{m.room ? ` • Room ${m.room}` : ''} • {m.cycle} cycle
                  </p>
                )}

                {queue.length > 0 && (
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
                )}

                {!isFree && (
                  isInQueue ? (
                    <button className="btn btn-leave" onClick={() => handleLeave(m.machine_key)}>Leave Queue</button>
                  ) : (
                    <button className="btn btn-join" onClick={() => handleJoin(m.machine_key)}>Join Queue</button>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      {toast && <div className="toast show">{toast}</div>}
      {showNameModal && <NameModal onSave={handleNameSave} onClose={() => setShowNameModal(false)} />}
      <BottomNav hostelId={hostelId} active="queue" />
    </div>
  );
}
