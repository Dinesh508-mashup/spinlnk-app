import { useState } from 'react';

const ICONS = {
  done: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
  ),
  available: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  booked: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14l2 2 4-4"/></svg>
  ),
  queue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3cc1a2" stroke="none"><path d="M16 3.5a2.5 2.5 0 015 0 2.5 2.5 0 01-5 0zM9 5a2.5 2.5 0 015 0A2.5 2.5 0 019 5zM3 6.5a2 2 0 014 0 2 2 0 01-4 0zM14.5 10c-1.5 0-3-.5-4-1.5C9.5 9.5 8 10 6.5 10 4.5 10 2 11 2 13v1.5c0 .5.5 1 1 1h18c.5 0 1-.5 1-1V13c0-2-2.5-3-4.5-3z"/></svg>
  ),
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationPanel({ notifications, unreadCount, onMarkAllRead, onClearAll, onClose }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => !n.read);

  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="notif-header">
          <h3>Notifications</h3>
          {unreadCount > 0 && <span className="notif-badge-lg">{unreadCount} new</span>}
          <button className="notif-close" onClick={onClose}>&times;</button>
        </div>

        {/* Tabs */}
        <div className="notif-tabs">
          <button className={`notif-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`notif-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* List */}
        <div className="notif-list">
          {filtered.length === 0 ? (
            <div className="notif-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <p>No notifications yet</p>
            </div>
          ) : (
            filtered.map(n => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                <div className="notif-icon-wrap">
                  {ICONS[n.icon] || ICONS.done}
                </div>
                <div className="notif-content">
                  <span className="notif-title">{n.title}</span>
                  <p className="notif-message">{n.message}</p>
                  <span className="notif-time">{timeAgo(n.time)}</span>
                </div>
                {!n.read && <span className="notif-dot" />}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="notif-footer">
            <button onClick={onMarkAllRead}>Mark all read</button>
            <button onClick={onClearAll}>Clear all</button>
          </div>
        )}
      </div>
    </div>
  );
}
