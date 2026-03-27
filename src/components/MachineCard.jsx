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
        <div className="machine-card-row">
          <div>
            <span className="status-badge free">FREE</span>
            <h3 className="machine-name">{m.name}</h3>
            <p className="machine-sub">Available now</p>
          </div>
          <span className="machine-emoji">🫧</span>
        </div>
        <button className="btn btn-book" onClick={() => onBook(m)}>Book Now →</button>
      </div>
    );
  }

  return (
    <div className="machine-card in-use">
      <div className="machine-card-row">
        <div>
          <span className="status-badge in-use">IN USE</span>
          <h3 className="machine-name">{m.name}</h3>
          <p className="machine-sub">{m.cycle} cycle • {m.user_name}{m.room ? ` • Room ${m.room}` : ''}</p>
        </div>
        <div className="timer-mini">{timeLeft}</div>
      </div>
      {queue.length > 0 && (
        <p className="queue-count-small">{queue.length} in queue</p>
      )}
      <div className="machine-card-actions">
        <button className="btn btn-secondary" onClick={() => onFree(m.machine_key)}>I'm Done Early</button>
        <button className="btn btn-moved" onClick={() => onFree(m.machine_key)}>I Moved the Clothes</button>
      </div>
    </div>
  );
}
