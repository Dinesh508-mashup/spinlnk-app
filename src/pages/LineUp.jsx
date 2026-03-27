import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import '../styles/Queue.css';

function formatMinsLeft(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 60000));
}

export default function LineUp() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading } = useMachines(hostelId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';

  if (hostelLoading || machinesLoading) {
    return <div className="app-container"><p className="loading">Loading...</p></div>;
  }
  if (hostelError) {
    return <div className="app-container"><p className="error-msg">{hostelError}</p></div>;
  }

  return (
    <div className="app-container has-nav">
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">📋</span>
          <div>
            <h1 className="app-title">SpinLnk</h1>
            <p className="app-subtitle">{hostelName} — Line-Up</p>
          </div>
        </div>
      </header>

      <div className="content">
        <h2 className="section-title">Queue Line-Up</h2>

        {machines.length === 0 ? (
          <p className="empty-state">No machines set up yet.</p>
        ) : (
          machines.map(m => {
            const queue = m.queue_members || [];
            const isFree = m.status !== 'in-use' || !m.end_time || Date.now() >= m.end_time;

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

                {queue.length > 0 ? (
                  <div className="queue-list">
                    <p className="queue-count">{queue.length} waiting in queue</p>
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
                  <p className="queue-empty">No one in queue</p>
                )}
              </div>
            );
          })
        )}
      </div>

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
