import { useState } from 'react';

export default function NameModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  const handleSave = () => {
    if (!name.trim() || !room.trim()) return;
    onSave(name.trim(), room.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Before you join</h3>
        <p>Enter your details so others know who's in the queue.</p>
        <label>YOUR NAME</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={20} />
        <label>ROOM NUMBER</label>
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Enter room number" maxLength={10} />
        <button className="btn btn-start" onClick={handleSave}>Save & Join</button>
        <button className="btn btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
