import { useState, useEffect } from 'react';

function formatTime(endTime) {
  const remaining = Math.max(0, endTime - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function BookingsList({ machines, onFree }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (machines.length === 0) {
    return (
      <div className="all-free-banner">
        <span>✅</span>
        <p>All machines are available! Go book one.</p>
      </div>
    );
  }

  return (
    <div className="bookings-list">
      <h3>Active Now</h3>
      {machines.map(m => (
        <div key={m.machine_key} className="booking-card">
          <div className="booking-info">
            <div className="booking-timer">{formatTime(m.end_time)}</div>
            <div>
              <span className="status-badge in-use">{m.name} — IN USE</span>
              <p className="booking-detail">{m.cycle} cycle • {m.user_name}{m.room ? ` • Room ${m.room}` : ''}</p>
            </div>
          </div>
          <div className="booking-actions">
            <button className="btn btn-secondary" onClick={() => onFree(m.machine_key)}>I'm Done Early</button>
            <button className="btn btn-moved" onClick={() => onFree(m.machine_key)}>I Moved the Clothes</button>
          </div>
        </div>
      ))}
    </div>
  );
}
