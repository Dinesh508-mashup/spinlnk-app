import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import useNotifications from '../hooks/useNotifications';
import useAlarm from '../hooks/useAlarm';
import { joinQueue, leaveQueue } from '../lib/supabase';
import NameModal from '../components/NameModal';
import NotificationPanel from '../components/NotificationPanel';
import AlarmOverlay from '../components/AlarmOverlay';
import spinlnkLogo from '../assets/spinlnk-logo.png';
import '../styles/Queue.css';
import '../styles/Notifications.css';
import '../styles/Alarm.css';

function formatMinsLeft(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 60000));
}

function timeAgo(joinedAt) {
  if (!joinedAt) return '';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000));
  return `Joined ${diff}m ago`;
}

/* Peak usage bar chart */
function PeakUsageChart() {
  const data = [
    { label: 'Mon', h: 45 }, { label: 'Tue', h: 35 }, { label: 'Wed', h: 55 },
    { label: 'Thu', h: 50 }, { label: 'Fri', h: 70 }, { label: 'Sat', h: 90 },
    { label: 'Sun', h: 80 },
  ];
  const barW = 28, gap = 10, maxH = 70;
  const totalW = data.length * (barW + gap);
  return (
    <div className="peak-chart-wrap">
      <svg width={totalW} height={maxH + 22} viewBox={`0 0 ${totalW} ${maxH + 22}`}>
        {data.map((d, i) => {
          const x = i * (barW + gap);
          const bh = (d.h / 100) * maxH;
          const isPeak = d.h >= 70;
          return (
            <g key={i}>
              <rect x={x} y={maxH - bh} width={barW} height={bh} rx={4}
                fill={isPeak ? '#dc3240' : '#356668'} opacity={isPeak ? 0.85 : 0.55} />
              <text x={x + barW / 2} y={maxH + 14} textAnchor="middle"
                fontSize="9" fill="#7f8c8d" fontFamily="DM Sans">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Join() {
  const { hostelId, hostelName, loading: hostelLoading, error: hostelError } = useHostel();
  const { machines, loading: machinesLoading, refresh } = useMachines(hostelId);
  const { notifications, unreadCount, markAllRead, clearAll, checkMachineEvents, notifyQueueJoined, requestPermission } = useNotifications(hostelId);
  const { ringing, alarmMachine, alarmType, stopAlarm, checkAlarm } = useAlarm();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingMachine, setPendingMachine] = useState(null);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(Date.now());
  const userName = localStorage.getItem('userName') || '';

  useEffect(() => { requestPermission(); }, [requestPermission]);
  useEffect(() => { checkMachineEvents(machines, userName); }, [machines, userName, checkMachineEvents]);
  useEffect(() => { checkAlarm(machines, userName); }, [machines, userName, checkAlarm]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

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

  const handleJoin = async (machineKey) => {
    if (!userName) {
      setPendingMachine(machineKey);
      setShowNameModal(true);
      return;
    }
    try {
      const queue = await joinQueue(hostelId, machineKey, userName, localStorage.getItem('userRoom') || '');
      const pos = queue.findIndex(q => q.name === userName) + 1;
      const machine = machines.find(m => m.machine_key === machineKey);
      notifyQueueJoined(machine?.name || `Machine ${machineKey}`, pos, userName);
      showToast(`You're #${pos} in queue for Machine ${machineKey}!`);
      refresh();
    } catch {
      showToast('Failed to join queue.');
    }
  };

  const handleLeave = async (machineKey) => {
    try {
      await leaveQueue(hostelId, machineKey, userName);
      showToast('You left the queue.');
      refresh();
    } catch {
      showToast('Failed to leave queue.');
    }
  };

  const handleNameSave = async (name, room) => {
    localStorage.setItem('userName', name);
    localStorage.setItem('userRoom', room);
    setShowNameModal(false);
    if (pendingMachine) {
      try {
        const queue = await joinQueue(hostelId, pendingMachine, name, room);
        const pos = queue.findIndex(q => q.name === name) + 1;
        showToast(`You're #${pos} in queue for Machine ${pendingMachine}!`);
        refresh();
      } catch {
        showToast('Failed to join queue.');
      }
    }
  };

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
        {/* Page heading */}
        <div className="join-heading">
          <h2>Join the Queue</h2>
          <p>Live status of available units</p>
        </div>

        {machines.length === 0 ? (
          <p className="empty-state">No machines set up yet.</p>
        ) : (
          <>
            {/* In-Use machines with queue */}
            {inUse.map(m => {
              const queue = m.queue_members || [];
              const isInQueue = queue.some(q => q.name === userName);

              return (
                <div key={m.machine_key} className="join-machine-section">
                  <div className="join-machine-header">
                    <span className="join-machine-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#356668" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="12" cy="12" r="4"/></svg>
                    </span>
                    <div className="join-machine-info">
                      <span className="join-machine-name">{m.name}</span>
                      <span className="join-machine-status in-use-text">In Use &mdash; {m.minsLeft} min left</span>
                    </div>
                  </div>

                  {/* Queue list */}
                  <div className="join-queue-list">
                    {queue.length > 0 ? queue.map((q, i) => (
                      <div key={i} className="join-queue-person">
                        <div className="join-queue-avatar">{q.name.charAt(0).toUpperCase()}</div>
                        <div className="join-queue-person-info">
                          <span className="join-queue-person-name">
                            {q.name}{q.name === userName ? ' (You)' : ''}
                          </span>
                          <span className="join-queue-person-detail">
                            {timeAgo(q.joined_at)}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="join-queue-empty">No one in queue yet. Be the first!</p>
                    )}
                  </div>

                  {isInQueue ? (
                    <button className="btn btn-leave" onClick={() => handleLeave(m.machine_key)}>Leave Queue</button>
                  ) : (
                    <button className="btn btn-join-queue" onClick={() => handleJoin(m.machine_key)}>Add Me to Queue</button>
                  )}
                </div>
              );
            })}

            {/* Free machines */}
            {free.map(m => (
              <div key={m.machine_key} className="join-machine-section">
                <div className="join-machine-header">
                  <span className="join-machine-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="12" cy="12" r="4"/></svg>
                  </span>
                  <div className="join-machine-info">
                    <span className="join-machine-name">{m.name}</span>
                    <span className="join-machine-status free-text">Free</span>
                  </div>
                </div>
                <button className="btn btn-scan" disabled>Scan QR to Book</button>
              </div>
            ))}

            {inUse.length === 0 && free.length > 0 && (
              <div className="all-free-msg" style={{ marginBottom: 16 }}>
                <span>&#x1F389;</span>
                <h3>All machines are free!</h3>
                <p>No need to queue &mdash; scan a machine QR to start a wash.</p>
              </div>
            )}

            {/* Divider */}
            <hr className="join-divider" />

            {/* Usage Insights */}
            <div className="join-insights">
              <h3 className="insights-title">Usage Insights</h3>

              <div className="insights-chart-card">
                <p className="insights-chart-label">Peak Usage Times</p>
                <PeakUsageChart />
              </div>

              <p className="insights-sub-title">Recommended Booking Slots</p>

              <div className="insights-slots">
                <div className="insight-slot-card">
                  <span className="slot-emoji">&#x2600;&#xFE0F;</span>
                  <div>
                    <strong>Morning</strong>
                    <span>8:30 &ndash; 10:00 AM</span>
                  </div>
                </div>
                <div className="insight-slot-card">
                  <span className="slot-emoji">&#x1F319;</span>
                  <div>
                    <strong>Late Night</strong>
                    <span>After 10:30 PM</span>
                  </div>
                </div>
              </div>

              <div className="insights-tip">
                <span className="tip-icon">&#x1F4A1;</span>
                <span>Tuesdays and Wednesdays are typically less crowded.</span>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && <div className="toast show">{toast}</div>}
      {showNameModal && <NameModal onSave={handleNameSave} onClose={() => setShowNameModal(false)} />}

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => navigate(`/queue${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="2" strokeLinecap="round"><path d="M1 12a11 11 0 0122 0"/><path d="M5 12a7 7 0 0114 0"/><path d="M9 12a3 3 0 016 0"/><circle cx="12" cy="12" r="1" fill="#3cc1a2"/></svg></span>
          <span className="nav-label">Live</span>
        </button>
        <button className="nav-center-btn" onClick={() => navigate(`/queue${param}`)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg>
        </button>
        <button className="nav-item active" onClick={() => navigate(`/join${param}`)}>
          <span className="nav-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="#3cc1a2" stroke="#3cc1a2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></span>
          <span className="nav-label">Join</span>
        </button>
      </nav>
    </div>
  );
}
