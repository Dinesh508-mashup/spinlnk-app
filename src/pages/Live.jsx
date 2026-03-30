import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import useNotifications from '../hooks/useNotifications';
import useAlarm from '../hooks/useAlarm';
import QrScannerModal from '../components/QrScannerModal';
import NotificationPanel from '../components/NotificationPanel';
import AlarmOverlay from '../components/AlarmOverlay';
import spinlnkLogo from '../assets/spinlnk-logo.png';
import '../styles/Queue.css';
import '../styles/Notifications.css';
import '../styles/Alarm.css';

function formatMinsLeft(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 60000));
}

/* countdown ring */
function CountdownRing({ minsLeft, total = 45 }) {
  const r = 16, stroke = 3;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(1, minsLeft / total);
  return (
    <svg width={40} height={40} className="countdown-ring">
      <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
      <circle cx={20} cy={20} r={r} fill="none" stroke="#fff" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round" transform="rotate(-90 20 20)" />
      <text x={20} y={21} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fontWeight="700" fill="#fff">{minsLeft}</text>
    </svg>
  );
}

export default function Live() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading } = useMachines(hostelId);
  const { notifications, unreadCount, markAllRead, clearAll, checkMachineEvents, requestPermission } = useNotifications(hostelId);
  const { ringing, alarmMachine, alarmType, stopAlarm, checkAlarm } = useAlarm();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [now, setNow] = useState(Date.now());
  const [showScanner, setShowScanner] = useState(false);
  const userName = localStorage.getItem('userName') || '';

  useEffect(() => { requestPermission(); }, [requestPermission]);
  useEffect(() => { checkMachineEvents(machines, userName); }, [machines, userName, checkMachineEvents]);
  useEffect(() => { checkAlarm(machines, userName); }, [machines, userName, checkAlarm]);

  const handleQrScan = useCallback((decodedText) => {
    setShowScanner(false);
    // If the QR contains a full URL, navigate to it; otherwise treat as machine booking URL
    try {
      const url = new URL(decodedText);
      window.location.href = url.href;
    } catch {
      // Not a URL — try navigating with hostel param
      navigate(`/home?hostel=${hostelId}`);
    }
  }, [navigate, hostelId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const machineStatuses = useMemo(() => {
    return machines.map(m => ({
      ...m,
      isFree: m.status !== 'in-use' || !m.end_time || now >= m.end_time,
      minsLeft: m.end_time ? formatMinsLeft(m.end_time) : 0,
    }));
  }, [machines, now]);

  if (hostelLoading || machinesLoading) {
    return <div className="app-container"><p className="loading">Loading...</p></div>;
  }
  if (hostelError) {
    return <div className="app-container"><p className="error-msg">{hostelError}</p></div>;
  }

  const inUse = machineStatuses.filter(m => !m.isFree);
  const free = machineStatuses.filter(m => m.isFree);

  return (
    <div className="app-container has-nav">
      {/* Header */}
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
          <p className="empty-state">No machines set up yet.</p>
        ) : (
          <>
            {/* In-Use machines */}
            {inUse.map(m => (
              <div key={m.machine_key} className="live-machine-card in-use-bg">
                <div className="live-machine-top">
                  <div>
                    <span className="status-badge in-use">In Use</span>
                    <h3 className="live-machine-name">{m.name}</h3>
                    <p className="live-machine-sub">Reserved by {m.user_name || 'Someone'}</p>
                  </div>
                  <div className="live-countdown-area">
                    <CountdownRing minsLeft={m.minsLeft} />
                    <span className="live-cycle-label">{m.cycle || 'Wash'}</span>
                  </div>
                </div>
                {(m.queue_members || []).length > 0 && (
                  <p className="live-queue-note">{m.queue_members.length} waiting in queue</p>
                )}
              </div>
            ))}

            {/* Free machines */}
            {free.map(m => (
              <div key={m.machine_key} className="live-machine-card free-bg">
                <div className="live-machine-top">
                  <div>
                    <span className="status-badge free">Free</span>
                    <h3 className="live-machine-name">{m.name}</h3>
                    <p className="live-machine-sub">Available immediately</p>
                  </div>
                  <span className="machine-emoji-lg"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg></span>
                </div>
                <button className="btn btn-scan" onClick={() => setShowScanner(true)}>
                  Scan QR to Book &rarr;
                </button>
              </div>
            ))}

            {inUse.length === 0 && (
              <div className="all-free-msg">
                <span>&#x1F389;</span>
                <h3>All machines are free!</h3>
                <p>No need to queue &mdash; scan a machine QR to start a wash.</p>
              </div>
            )}
          </>
        )}
      </div>

      {showScanner && (
        <QrScannerModal onScan={handleQrScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => navigate(`/queue${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="2" strokeLinecap="round"><path d="M1 12a11 11 0 0122 0"/><path d="M5 12a7 7 0 0114 0"/><path d="M9 12a3 3 0 016 0"/><circle cx="12" cy="12" r="1" fill="#3cc1a2"/></svg></span>
          <span className="nav-label">Live</span>
        </button>
        <button className="nav-center-btn" onClick={() => navigate(`/queue${param}`)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg>
        </button>
        <button className="nav-item" onClick={() => navigate(`/join${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="#3cc1a2" stroke="#3cc1a2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></span>
          <span className="nav-label">Join</span>
        </button>
      </nav>
    </div>
  );
}
