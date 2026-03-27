import { useState, useEffect } from 'react';

function formatTime(endTime) {
  const remaining = Math.max(0, endTime - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function MachineCard({ machine, onBook, onFree }) {
  const m = machine;
  const isFree = m.status === 'free' || (m.status === 'in-use' && m.end_time && Date.now() >= m.end_time);
  const [timeLeft, setTimeLeft] = useState(isFree ? '' : formatTime(m.end_time));

  useEffect(() => {
    if (isFree) return;
    const interval = setInterval(() => {
      const t = formatTime(m.end_time);
      setTimeLeft(t);
      if (t === '00:00') clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [m.end_time, isFree]);

  const queue = m.queue_members || [];

  if (isFree) {
    return (
      <div className="machine-card free">
        <div className="machine-card-header">
          <div className="machine-card-info">
            <span className="status-badge free">FREE</span>
            <h3 className="machine-name">{m.name}</h3>
            <p className="machine-sub">Available now</p>
          </div>
          <span className="machine-emoji">🫧</span>
        </div>
        <button className="btn btn-start-wash" onClick={() => onBook(m)}>Start Wash</button>
      </div>
    );
  }

  return (
    <div className="machine-card in-use">
      <div className="machine-card-header">
        <div className="machine-card-info">
          <span className="status-badge in-use">IN USE</span>
          <h3 className="machine-name">{m.name}</h3>
        </div>
        <span className="machine-emoji">🫧</span>
      </div>
      <div className="machine-card-timer-row">
        <div className="timer-mini">{timeLeft}</div>
        <div>
          <p className="timer-cycle-label">{m.cycle} cycle</p>
          <p className="timer-user-label">{m.user_name}{m.room ? ` - Room ${m.room}` : ''}</p>
        </div>
      </div>
      {queue.length > 0 && (
        <p className="queue-count-small">{queue.length} in queue</p>
      )}
    </div>
  );
}
