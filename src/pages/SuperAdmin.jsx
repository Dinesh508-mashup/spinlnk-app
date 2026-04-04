import { useState, useEffect } from 'react';
import { supabase, getHostel, createHostel } from '../lib/supabase';
import spinlnkLogo from '../assets/spinlnk-logo.png';
import '../styles/Admin.css';

const SUPER_ADMIN_CODE = 'spinlnk2024';

export default function SuperAdmin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [hostels, setHostels] = useState([]);
  const [toast, setToast] = useState('');
  const [showPassword, setShowPassword] = useState({});

  // Form state
  const [hostelName, setHostelName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchHostels = async () => {
    const { data, error } = await supabase.from('hostels').select('id, hostel_name, login_id, admin_id, contact_number, created_at').order('created_at', { ascending: false });
    if (!error) setHostels(data || []);
  };

  useEffect(() => {
    if (authenticated) fetchHostels();
  }, [authenticated]);

  const handleAccessSubmit = (e) => {
    e.preventDefault();
    if (accessCode === SUPER_ADMIN_CODE) {
      setAuthenticated(true);
    } else {
      showToast('Invalid access code.');
    }
  };

  const normalizeId = (input) =>
    input.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    if (creating) return;

    const trimName = hostelName.trim();
    const trimLoginId = loginId.trim();
    const trimAdminId = adminId.trim();
    const trimContact = contactNumber.trim();
    const trimPass = password.trim();

    if (!trimName) { showToast('Hostel Full Name is required.'); return; }
    if (!trimLoginId) { showToast('Hostel Login ID is required.'); return; }
    if (!trimAdminId) { showToast('Admin ID is required.'); return; }
    if (!trimContact) { showToast('Contact Number is required.'); return; }
    if (!trimPass) { showToast('Password is required.'); return; }
    if (trimPass.length < 4) { showToast('Password must be at least 4 characters.'); return; }
    if (trimPass !== confirmPassword) { showToast('Passwords do not match.'); return; }

    const normalized = normalizeId(trimLoginId);
    setCreating(true);

    try {
      const existing = await getHostel(normalized);
      if (existing) {
        showToast(`Hostel with Login ID "${normalized}" already exists.`);
        setCreating(false);
        return;
      }

      await createHostel(normalized, trimName, trimLoginId, trimAdminId, trimContact, trimPass);
      showToast(`Hostel "${trimName}" created successfully!`);

      setHostelName('');
      setLoginId('');
      setAdminId('');
      setContactNumber('');
      setPassword('');
      setConfirmPassword('');
      fetchHostels();
    } catch (err) {
      showToast('Error: ' + (err.message || 'Failed to create hostel'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteHostel = async (id) => {
    if (!confirm(`Delete hostel "${id}"? This will remove all its machines and data.`)) return;
    try {
      await supabase.from('machines').delete().eq('hostel_id', id);
      await supabase.from('wash_history').delete().eq('hostel_id', id);
      await supabase.from('hostels').delete().eq('id', id);
      showToast(`Hostel "${id}" deleted.`);
      fetchHostels();
    } catch (err) {
      showToast('Delete failed: ' + (err.message || ''));
    }
  };

  const togglePassword = (id) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ===== ACCESS CODE SCREEN =====
  if (!authenticated) {
    return (
      <div className="admin-container">
        <div className="login-page">
          <img src={spinlnkLogo} alt="SpinLnk" className="login-logo-img" />
          <p className="login-tagline">Super Admin Access</p>

          <form className="login-form" onSubmit={handleAccessSubmit}>
            <h2>Enter Access Code</h2>
            <p className="login-sub">This area is restricted to SpinLnk administrators</p>

            <label>ACCESS CODE</label>
            <input
              type="password"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              placeholder="Enter super admin code"
              required
            />

            <button type="submit" className="btn btn-login">Verify &rarr;</button>
          </form>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </div>
    );
  }

  // ===== MAIN PANEL =====
  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1>Super Admin</h1>
          <p className="hostel-label">Manage all hostels</p>
        </div>
        <button className="logout-btn" onClick={() => setAuthenticated(false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </header>

      <div className="admin-content">
        {/* Create Hostel Form */}
        <div className="sa-create-section">
          <h2 className="section-title">Create New Hostel</h2>

          <form onSubmit={handleCreateHostel} className="sa-form">
            <label>HOSTEL FULL NAME</label>
            <input
              value={hostelName}
              onChange={e => setHostelName(e.target.value)}
              placeholder="e.g. Sunrise Boys Hostel"
              required
            />

            <label>HOSTEL LOGIN ID</label>
            <input
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder="e.g. sunrise_hostel"
              required
            />
            {loginId && (
              <p className="sa-hint">Will be saved as: <strong>{normalizeId(loginId)}</strong></p>
            )}

            <label>ADMIN ID</label>
            <input
              value={adminId}
              onChange={e => setAdminId(e.target.value)}
              placeholder="e.g. admin_sunrise"
              required
            />

            <label>CONTACT NUMBER</label>
            <input
              type="tel"
              value={contactNumber}
              onChange={e => setContactNumber(e.target.value)}
              placeholder="e.g. +91 7075194320"
              required
            />

            <label>PASSWORD</label>
            <div className="password-wrap">
              <input
                type={showPassword.create ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 4 characters"
                required
              />
              <button type="button" className="eye-btn" onClick={() => togglePassword('create')}>
                {showPassword.create ? '\u{1F648}' : '\u{1F441}'}
              </button>
            </div>

            <label>CONFIRM PASSWORD</label>
            <div className="password-wrap">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
              <button type="button" className="eye-btn" onClick={() => togglePassword('confirm')}>
                {showPassword.confirm ? '\u{1F648}' : '\u{1F441}'}
              </button>
            </div>

            <button type="submit" className="btn btn-add" disabled={creating}>{creating ? 'Creating...' : 'Create Hostel'}</button>
          </form>
        </div>

        {/* Existing Hostels */}
        <h2 className="section-title" style={{ marginTop: 28 }}>
          All Hostels ({hostels.length})
        </h2>

        <div className="machine-admin-list">
          {hostels.length === 0 ? (
            <p className="sa-empty">No hostels created yet.</p>
          ) : (
            hostels.map(h => (
              <div key={h.id} className="machine-admin-card">
                <div className="machine-admin-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="machine-admin-info">
                  <span className="machine-admin-name">{h.hostel_name || h.id}</span>
                  <span className="machine-admin-meta">
                    Login: {h.login_id || h.id} &bull; Admin: {h.admin_id || '—'} &bull; {h.contact_number || '—'}
                  </span>
                  <span className="machine-admin-meta">
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button className="delete-btn" onClick={() => handleDeleteHostel(h.id)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#e74c3c" stroke="#e74c3c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
