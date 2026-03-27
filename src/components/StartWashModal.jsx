import { useState } from 'react';

const CYCLES = [
  { name: 'Express', minutes: 15, icon: '🚀' },
  { name: 'Quick', minutes: 30, icon: '⚡' },
  { name: 'Normal', minutes: 45, icon: '🌊' },
  { name: 'Heavy', minutes: 60, icon: '💎' },
  { name: 'Deep Clean', minutes: 90, icon: '🧽' },
];

export default function StartWashModal({ machine, onStart, onClose }) {
  const [name, setName] = useState(localStorage.getItem('userName') || '');
  const [room, setRoom] = useState(localStorage.getItem('userRoom') || '');
  const [cycle, setCycle] = useState(CYCLES[2]);
  const [customMin, setCustomMin] = useState(20);
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!room.trim()) { setError('Enter your room number.'); return; }
    localStorage.setItem('userName', name.trim());
    localStorage.setItem('userRoom', room.trim());
    const c = useCustom ? { name: 'Custom', minutes: customMin } : cycle;
    onStart(machine.machine_key, name.trim(), room.trim(), c.name, c.minutes);
  };

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-inner">
        <div className="start-wash-machine-icon">🧺</div>
        <h2>{machine.name} is yours 🤙</h2>

        <label>YOUR NAME</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={20} />

        <label>ROOM NUMBER</label>
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Enter room number" maxLength={10} />

        <label>SELECT WASH CYCLE</label>
        <div className="cycle-list">
          {CYCLES.map(c => (
            <button
              key={c.name}
              className={`cycle-btn ${!useCustom && cycle.name === c.name ? 'selected' : ''}`}
              onClick={() => { setCycle(c); setUseCustom(false); }}
            >
              <span>{c.icon}</span>
              <div><strong>{c.name}</strong><small>{c.minutes} min</small></div>
            </button>
          ))}
          <button
            className={`cycle-btn ${useCustom ? 'selected' : ''}`}
            onClick={() => setUseCustom(true)}
          >
            <span>⏱️</span>
            <div><strong>Custom Timer</strong><small>Set time</small></div>
          </button>
        </div>

        {useCustom && (
          <div className="custom-picker">
            <button onClick={() => setCustomMin(Math.max(5, customMin - 5))}>−</button>
            <span className="custom-value">{customMin} min</span>
            <button onClick={() => setCustomMin(Math.min(180, customMin + 5))}>+</button>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-start-wash" onClick={handleSubmit}>Start Wash</button>
        <p className="hint">You'll get notified when it's done</p>
        <button className="btn btn-cancel" onClick={onClose} style={{marginTop: 8}}>Cancel</button>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item active">
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button className="nav-item">
          <span className="nav-icon">📋</span>
          <span className="nav-label">Line-Up</span>
        </button>
      </nav>
    </div>
  );
}
