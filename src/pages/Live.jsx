import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import '../styles/Queue.css';

function formatMinsLeft(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 60000));
}

export default function Live() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading } = useMachines(hostelId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const inUse = machineStatuses.filter(m => !m.isFree);
  const free = machineStatuses.filter(m => m.isFree);

  return (
    <div className="app-container has-nav">
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
          <>
            {inUse.map(m => (
              <div key={m.machine_key} className="queue-card">
                <div className="queue-card-header">
                  <h3>{m.name}</h3>
                  <span className="status-badge in-use">IN USE — {m.minsLeft} min left</span>
                </div>
                <p className="queue-reserved">
                  Reserved by {m.user_name}{m.room ? ` • Room ${m.room}` : ''} • {m.cycle} cycle
                </p>
                {(m.queue_members || []).length > 0 && (
                  <p className="queue-count">{m.queue_members.length} waiting in queue</p>
                )}
              </div>
            ))}

            {free.map(m => (
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

            {inUse.length === 0 && (
              <div className="all-free-msg">
                <span>🎉</span>
                <h3>All machines are free!</h3>
                <p>No need to queue — scan a machine QR to start a wash.</p>
              </div>
            )}

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

      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => navigate(`/queue${param}`)}>
          <span className="nav-icon">📡</span>
          <span className="nav-label">Live</span>
        </button>
        <button className="nav-item" onClick={() => navigate(`/join${param}`)}>
          <span className="nav-icon">✋</span>
          <span className="nav-label">Join</span>
        </button>
      </nav>
    </div>
  );
}
