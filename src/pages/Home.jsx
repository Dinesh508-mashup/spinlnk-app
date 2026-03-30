import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import useNotifications from '../hooks/useNotifications';
import useAlarm from '../hooks/useAlarm';
import MachineCard from '../components/MachineCard';
import StartWashModal from '../components/StartWashModal';
import NotificationPanel from '../components/NotificationPanel';
import AlarmOverlay from '../components/AlarmOverlay';
import { registerServiceWorker, subscribeToPush, pushBookingConfirmed } from '../lib/pushNotifications';
import { insertTimerAlert } from '../lib/supabase';
import spinlnkLogo from '../assets/spinlnk-logo.png';
import '../styles/Home.css';
import '../styles/Notifications.css';
import '../styles/Alarm.css';

export default function Home() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading, startWash, freeMachine } = useMachines(hostelId);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const { notifications, unreadCount, markAllRead, clearAll, checkMachineEvents, notifyBookingConfirmed, requestPermission } = useNotifications(hostelId);
  const { ringing, alarmMachine, alarmType, stopAlarm, checkAlarm } = useAlarm();
  const userName = localStorage.getItem('userName') || '';

  useEffect(() => {
    requestPermission();
    (async () => {
      const reg = await registerServiceWorker();
      if (reg && userName && hostelId) {
        await subscribeToPush(reg, userName, hostelId);
      }
    })();
  }, [requestPermission, userName, hostelId]);
  useEffect(() => { checkMachineEvents(machines, userName); }, [machines, userName, checkMachineEvents]);
  useEffect(() => { checkAlarm(machines, userName); }, [machines, userName, checkAlarm]);

  if (hostelLoading || machinesLoading) {
    return <div className="app-container"><p className="loading">Loading...</p></div>;
  }
  if (hostelError) {
    return <div className="app-container"><p className="error-msg">{hostelError}</p></div>;
  }

  const handleStartWash = async (machineKey, name, room, cycle, minutes, accessCode) => {
    await startWash(machineKey, name, room, cycle, minutes, accessCode);
    const machine = machines.find(m => m.machine_key === machineKey);
    const mName = machine?.name || `Machine ${machineKey}`;
    notifyBookingConfirmed(mName, name, cycle, minutes);
    pushBookingConfirmed(hostelId, name, mName, cycle, minutes);
    // Register server-side push alarm for when the session ends
    const alertAt = new Date(Date.now() + minutes * 60 * 1000);
    insertTimerAlert(hostelId, machineKey, mName, name, 'session', alertAt);
    setSelectedMachine(null);
  };

  return (
    <div className="app-container has-nav">
      <header className="header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src={spinlnkLogo} alt="SpinLnk" className="header-logo-img" />
        <button className="notif-bell" onClick={() => setShowNotifPanel(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>
      </header>

      {showNotifPanel && (
        <NotificationPanel notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onClearAll={clearAll} onClose={() => setShowNotifPanel(false)} />
      )}

      {ringing && <AlarmOverlay machineName={alarmMachine} alarmType={alarmType} onStop={stopAlarm} />}

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

            {/* Usage Insights */}
            <div className="insights-section">
              <h3 className="insights-title">Usage Insights</h3>

              <div className="insights-card">
                <p className="insights-label">PEAK USAGE TIMES</p>
                <div className="insights-chart">
                  {[
                    { day: 'Mon', h: 30 }, { day: 'Tue', h: 25 }, { day: 'Wed', h: 40 },
                    { day: 'Thu', h: 35 }, { day: 'Fri', h: 70 }, { day: 'Sat', h: 90 }, { day: 'Sun', h: 85 },
                  ].map(d => (
                    <div key={d.day} className="insights-bar-col">
                      <div className={`insights-bar ${d.h >= 70 ? 'peak' : ''}`} style={{ height: `${d.h}%` }} />
                      <span className="insights-bar-label">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="insights-subtitle">Recommended Booking Slots</h3>
              <div className="insights-slots">
                <div className="insights-slot">
                  <span className="slot-dot morning" />
                  <div>
                    <strong>Morning</strong>
                    <p>8:30 &ndash; 10:00 AM</p>
                  </div>
                </div>
                <div className="insights-slot">
                  <span className="slot-dot night" />
                  <div>
                    <strong>Late Night</strong>
                    <p>After 10:30 PM</p>
                  </div>
                </div>
              </div>

              <div className="insights-tip">
                <span className="tip-icon">💡</span>
                <span>Tuesdays and Wednesdays are typically less crowded.</span>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedMachine && (
        <StartWashModal machine={selectedMachine} onStart={handleStartWash} onClose={() => setSelectedMachine(null)} />
      )}

      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => navigate(`/home${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="#e8594f" strokeWidth="2.5"/><path d="M12 2a10 10 0 0110 10" stroke="#3cc1a2" strokeWidth="3" strokeLinecap="round"/></svg></span>
          <span className="nav-label">Home</span>
        </button>
        <button className="nav-center-btn" onClick={() => navigate(`/home${param}`)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg>
        </button>
        <button className="nav-item" onClick={() => navigate(`/lineup${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="#3cc1a2" stroke="none"><path d="M16 3.5a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0zM9 5a2.5 2.5 0 015 0A2.5 2.5 0 019 5zM3 6.5a2 2 0 014 0 2 2 0 01-4 0zM14.5 10c-1.5 0-3-.5-4-1.5C9.5 9.5 8 10 6.5 10 4.5 10 2 11 2 13v1.5c0 .5.5 1 1 1h18c.5 0 1-.5 1-1V13c0-2-2.5-3-4.5-3z"/><path d="M5 18h14c.5 0 1 .5 1 1s-.5 1-1 1H5c-.5 0-1-.5-1-1s.5-1 1-1z"/></svg></span>
          <span className="nav-label">Line-Up</span>
        </button>
      </nav>
    </div>
  );
}
