import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import MachineCard from '../components/MachineCard';
import StartWashModal from '../components/StartWashModal';
import BookingsList from '../components/BookingsList';
import '../styles/Home.css';

export default function Home() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading, startWash, freeMachine } = useMachines(hostelId);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';

  if (hostelLoading || machinesLoading) {
    return <div className="app-container"><p className="loading">Loading...</p></div>;
  }
  if (hostelError) {
    return <div className="app-container"><p className="error-msg">{hostelError}</p></div>;
  }

  const handleStartWash = async (machineKey, name, room, cycle, minutes) => {
    await startWash(machineKey, name, room, cycle, minutes);
    setSelectedMachine(null);
  };

  const activeMachines = machines.filter(m => m.status === 'in-use' && m.end_time && Date.now() < m.end_time);

  return (
    <div className="app-container has-nav">
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">🧺</span>
          <div>
            <h1 className="app-title">SpinLnk</h1>
            <p className="app-subtitle">{hostelName}</p>
          </div>
        </div>
        <div className="header-right">
          <button className="header-icon-btn" aria-label="Notifications">🔔</button>
          <button className="header-icon-btn" aria-label="Settings">⚙️</button>
        </div>
      </header>

      <div className="content">
        {machines.length === 0 ? (
          <p className="empty-state">No machines available yet.</p>
        ) : (
          <>
            <div className="machine-list">
              {machines.map(m => (
                <MachineCard key={m.machine_key} machine={m} onBook={setSelectedMachine} onFree={freeMachine} />
              ))}
            </div>
            {activeMachines.length > 0 && (
              <>
                <h2 className="section-title" style={{marginTop: 24}}>Active Bookings</h2>
                <BookingsList machines={activeMachines} onFree={freeMachine} />
              </>
            )}
          </>
        )}
      </div>

      {selectedMachine && (
        <StartWashModal machine={selectedMachine} onStart={handleStartWash} onClose={() => setSelectedMachine(null)} />
      )}

      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => navigate(`/${param}`)}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button className="nav-item" onClick={() => navigate(`/lineup${param}`)}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">Line-Up</span>
        </button>
      </nav>
    </div>
  );
}
