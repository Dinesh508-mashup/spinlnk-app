import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useHostel from '../hooks/useHostel';
import useMachines from '../hooks/useMachines';
import '../styles/Queue.css';

function formatMinsLeft(endTime) {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 60000));
}

/* tiny SVG bar chart for usage forecast */
function UsageForecastChart() {
  const hours = [
    { label: '6a', h: 20 }, { label: '8a', h: 15 }, { label: '10a', h: 25 },
    { label: '12p', h: 40 }, { label: '2p', h: 50 }, { label: '4p', h: 60 },
    { label: '5p', h: 90 }, { label: '6p', h: 95 }, { label: '7p', h: 85 },
    { label: '8p', h: 70 }, { label: '9p', h: 45 }, { label: '11p', h: 20 },
  ];
  const barW = 18, gap = 6, maxH = 80;
  const totalW = hours.length * (barW + gap);
  return (
    <div className="forecast-chart-wrap">
      <svg width={totalW} height={maxH + 22} viewBox={`0 0 ${totalW} ${maxH + 22}`}>
        {hours.map((h, i) => {
          const x = i * (barW + gap);
          const bh = (h.h / 100) * maxH;
          const isPeak = h.h >= 80;
          return (
            <g key={i}>
              <rect x={x} y={maxH - bh} width={barW} height={bh} rx={4}
                fill={isPeak ? '#dc3240' : '#356668'} opacity={isPeak ? 0.85 : 0.55} />
              <text x={x + barW / 2} y={maxH + 14} textAnchor="middle"
                fontSize="8" fill="#7f8c8d" fontFamily="DM Sans">{h.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const param = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const [now, setNow] = useState(Date.now());

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
      <header className="header">
        <div className="header-left">
          <button className="header-icon-btn" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h1 className="app-title">SpinLnk</h1>
        </div>
        <div className="header-right">
          <div className="header-avatar">
            {(localStorage.getItem('userName') || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="content">
        {/* Greeting */}
        <div className="live-greeting">
          <h2>Hey <span role="img" aria-label="wave">&#x1F44B;</span></h2>
          <p>Which machine do you need?</p>
        </div>

        {/* Alert banner */}
        <div className="live-alert">
          <span className="live-alert-icon">&#x26C8;&#xFE0F;</span>
          <span>Rainy day ahead &mdash; expect higher dryer demand this evening.</span>
        </div>

        {/* Usage Forecast */}
        <div className="forecast-card">
          <p className="forecast-label">USAGE FORECAST</p>
          <p className="forecast-detail"><strong>Busiest hours:</strong> 5 PM &ndash; 8 PM</p>
          <p className="forecast-detail"><strong>Free Times:</strong> 8 AM &ndash; 11 AM</p>
          <UsageForecastChart />
        </div>

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
                  <span className="machine-emoji-lg">&#x1FAE7;</span>
                </div>
                <button className="btn btn-scan" disabled>
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

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => navigate(`/queue${param}`)}>
          <span className="nav-icon">&#x1F4E1;</span>
          <span className="nav-label">Live</span>
        </button>
        <button className="nav-item" onClick={() => navigate(`/join${param}`)}>
          <span className="nav-icon">&#x270B;</span>
          <span className="nav-label">Join</span>
        </button>
      </nav>
    </div>
  );
}
