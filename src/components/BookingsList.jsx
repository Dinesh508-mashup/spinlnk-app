import { useState, useEffect } from 'react';

function getTimeData(endTime, totalMinutes) {
  const remaining = Math.max(0, endTime - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const totalMs = totalMinutes * 60 * 1000;
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, remaining / totalMs)) : 0;
  return {
    display: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    progress,
  };
}

function getCycleMinutes(cycleName) {
  const map = { Express: 15, Quick: 30, Normal: 45, Heavy: 60, 'Deep Clean': 90 };
  return map[cycleName] || 45;
}

const RING_RADIUS = 76;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
      {machines.map(m => {
        const totalMin = getCycleMinutes(m.cycle);
        const { display, progress } = getTimeData(m.end_time, totalMin);
        const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

        return (
          <div key={m.machine_key} className="booking-card">
            <div className="booking-card-header">
              <span className="status-badge in-use">{m.name} — IN USE</span>
              <p className="booking-cycle-label">{m.cycle} {totalMin} min</p>
            </div>

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
                  <span className="timer-ring-time">{display}</span>
                  <span className="timer-ring-user">{m.user_name}</span>
                </div>
              </div>
            </div>

            <div className="booking-actions">
              <button className="btn btn-done-early" onClick={() => onFree(m.machine_key)}>I'm Done Early</button>
              <button className="btn btn-moved" onClick={() => onFree(m.machine_key)}>I Moved the Clothes</button>
            </div>
            <p className="booking-hint">We'll ping you before it ends</p>
          </div>
        );
      })}
    </div>
  );
}
