export default function AlarmOverlay({ machineName, alarmType, onStop }) {
  const isQueue = alarmType === 'queue';

  return (
    <div className="alarm-overlay">
      <div className="alarm-card">
        <div className={`alarm-icon-ring ${isQueue ? 'alarm-icon-queue' : ''}`}>
          {isQueue ? (
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#fff" stroke="none">
              <path d="M16 3.5a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0zM9 5a2.5 2.5 0 015 0A2.5 2.5 0 019 5zM3 6.5a2 2 0 014 0 2 2 0 01-4 0zM14.5 10c-1.5 0-3-.5-4-1.5C9.5 9.5 8 10 6.5 10 4.5 10 2 11 2 13v1.5c0 .5.5 1 1 1h18c.5 0 1-.5 1-1V13c0-2-2.5-3-4.5-3z"/>
            </svg>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          )}
        </div>
        <h2 className="alarm-title">{isQueue ? 'Your Turn!' : "Time's Up!"}</h2>
        <p className="alarm-message">
          {isQueue
            ? machineName
            : `${machineName} has finished. Collect your clothes now!`}
        </p>
        <button className={`alarm-stop-btn ${isQueue ? 'alarm-stop-queue' : ''}`} onClick={onStop}>
          Stop Alarm
        </button>
      </div>
    </div>
  );
}
