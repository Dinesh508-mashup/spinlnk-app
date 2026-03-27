import { useState } from 'react';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import MachineCard from '../components/MachineCard';
import StartWashModal from '../components/StartWashModal';
import BookingsList from '../components/BookingsList';
import BottomNav from '../components/BottomNav';
import '../styles/Home.css';

export default function Home() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading, startWash, freeMachine } = useMachines(hostelId);
  const [tab, setTab] = useState('machines');
  const [selectedMachine, setSelectedMachine] = useState(null);

  if (hostelLoading || machinesLoading) {
    return <div className="app-container"><p className="loading">Loading...</p></div>;
  }

  if (hostelError) {
    return <div className="app-container"><p className="error-msg">{hostelError}</p></div>;
  }

  const handleStartWash = async (machineKey, name, room, cycle, minutes) => {
    await startWash(machineKey, name, room, cycle, minutes);
    setSelectedMachine(null);
    setTab('bookings');
  };

  const activeMachines = machines.filter(m => m.status === 'in-use' && m.end_time && Date.now() < m.end_time);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">🧺</span>
          <div>
            <h1 className="app-title">SpinLnk</h1>
            <p className="app-subtitle">{hostelName}</p>
          </div>
        </div>
      </header>

      <div className="tabs">
        <button className={`tab ${tab === 'machines' ? 'active' : ''}`} onClick={() => setTab('machines')}>Machines</button>
        <button className={`tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>Bookings</button>
      </div>

      <div className="content">
        {tab === 'machines' && (
          machines.length === 0 ? (
            <p className="empty-state">No machines available yet.</p>
          ) : (
            <div className="machine-list">
              {machines.map(m => (
                <MachineCard key={m.machine_key} machine={m} onBook={setSelectedMachine} onFree={freeMachine} />
              ))}
            </div>
          )
        )}

        {tab === 'bookings' && (
          <BookingsList machines={activeMachines} onFree={freeMachine} />
        )}
      </div>

      {selectedMachine && (
        <StartWashModal
          machine={selectedMachine}
          onStart={handleStartWash}
          onClose={() => setSelectedMachine(null)}
        />
      )}

      <BottomNav hostelId={hostelId} active="home" />
    </div>
  );
}
