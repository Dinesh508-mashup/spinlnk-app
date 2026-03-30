import { useNavigate } from 'react-router-dom';

export default function BottomNav({ hostelId, active }) {
  const navigate = useNavigate();
  const param = hostelId ? `?hostel=${hostelId}` : '';

  return (
    <nav className="bottom-nav">
      <button className={`nav-item ${active === 'home' ? 'active' : ''}`} onClick={() => navigate(`/home${param}`)}>
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </button>
      <button className={`nav-item ${active === 'queue' ? 'active' : ''}`} onClick={() => navigate(`/queue${param}`)}>
        <span className="nav-icon">📡</span>
        <span className="nav-label">Live</span>
      </button>
    </nav>
  );
}
