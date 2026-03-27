import { useState, useEffect, useCallback } from 'react';
import { getHostel, createHostel, getMachines, addMachine, deleteMachine, getWashHistory, updateHostelQR } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/Admin.css';

export default function Admin() {
  const [screen, setScreen] = useState('login');
  const [hostelId, setHostelId] = useState(null);
  const [hostelName, setHostelName] = useState('');
  const [machines, setMachines] = useState([]);
  const [totalWashes, setTotalWashes] = useState(0);
  const [avgWait, setAvgWait] = useState(0);
  const [toast, setToast] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Check existing login
  useEffect(() => {
    const saved = localStorage.getItem('spinlnk_admin_hostel');
    if (saved) {
      setHostelId(saved);
      setScreen('panel');
    }
  }, []);

  // Fetch data when on panel
  const fetchData = useCallback(async () => {
    if (!hostelId) return;
    try {
      const [machineData, historyData] = await Promise.all([
        getMachines(hostelId),
        getWashHistory(hostelId),
      ]);
      setMachines(machineData);
      setTotalWashes(historyData.length);
      const durations = historyData.filter(h => typeof h.duration === 'number').map(h => h.duration);
      setAvgWait(durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0);
    } catch (e) {
      console.error('Fetch error:', e);
    }
  }, [hostelId]);

  useEffect(() => {
    if (screen === 'panel' && hostelId) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [screen, hostelId, fetchData]);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    const form = e.target;
    const inputId = form.hostelId.value.trim();
    const password = form.password.value;
    if (!inputId || !password) { showToast('Fill in all fields.'); return; }

    const normalizedId = inputId.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    try {
      const hostel = await getHostel(normalizedId);
      if (hostel) {
        if (hostel.password !== password) { showToast('Invalid password.'); return; }
        setHostelName(hostel.name);
      } else {
        await createHostel(normalizedId, inputId, password);
        setHostelName(inputId);
      }
      setHostelId(normalizedId);
      localStorage.setItem('spinlnk_admin_hostel', normalizedId);
      setScreen('panel');
      showToast(`Welcome! Hostel: ${inputId}`);
    } catch (err) {
      console.error('Login error:', err);
      showToast('Connection error: ' + (err.message || 'Unknown'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spinlnk_admin_hostel');
    setHostelId(null);
    setScreen('login');
  };

  // Add machine
  const handleAddMachine = async () => {
    try {
      const existingKeys = machines.map(m => m.machine_key);
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let next = null;
      for (const l of letters) {
        if (!existingKeys.includes(l)) { next = l; break; }
      }
      if (!next) { showToast('Max machines reached.'); return; }
      await addMachine(hostelId, next, `Machine ${next}`, 'washer');
      showToast(`Machine ${next} added!`);
      fetchData();
    } catch (e) {
      showToast('Failed to add: ' + (e.message || ''));
    }
  };

  // Delete machine
  const handleDeleteMachine = async (machineKey) => {
    try {
      await deleteMachine(hostelId, machineKey);
      showToast(`Machine ${machineKey} deleted.`);
      fetchData();
    } catch (e) {
      showToast('Failed to delete: ' + (e.message || ''));
    }
  };

  const baseUrl = window.location.origin + '/';
  const machineQrUrl = `${baseUrl}?hostel=${hostelId}`;
  const roomQrUrl = `${baseUrl}queue?hostel=${hostelId}`;

  // Save QR URLs on QR screen
  useEffect(() => {
    if (screen === 'qr' && hostelId) {
      updateHostelQR(hostelId, machineQrUrl, roomQrUrl).catch(() => {});
    }
  }, [screen, hostelId, machineQrUrl, roomQrUrl]);

  // ===== RENDER =====
  if (screen === 'login') {
    return (
      <div className="admin-container">
        <div className="login-page">
          <div className="login-logo">🧺</div>
          <h1 className="login-brand">SpinLnk</h1>
          <p className="login-tagline">Laundry intelligence for your hostel</p>

          <form className="login-form" onSubmit={handleLogin}>
            <h2>Welcome Back!</h2>
            <p className="login-sub">Please enter your details to sign in</p>

            <label>HOSTEL ID</label>
            <input name="hostelId" placeholder="e.g. sunny_hostel" required />

            <label>PASSWORD</label>
            <div className="password-wrap">
              <input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" required />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>

            <button type="submit" className="btn btn-login">Login →</button>
          </form>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </div>
    );
  }

  if (screen === 'qr') {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <button className="back-btn" onClick={() => setScreen('panel')}>←</button>
          <h1>QR Codes</h1>
          <button className="logout-btn" onClick={handleLogout}>↩</button>
        </header>

        <div className="admin-content">
          <div className="qr-section">
            <h2>Machine QR Code</h2>
            <p className="qr-desc">Residents scan this to book machines directly.</p>
            <div className="qr-preview">
              <QRCodeSVG value={machineQrUrl} size={200} level="M" />
            </div>
            <p className="qr-url">{machineQrUrl}</p>
          </div>

          <div className="qr-section">
            <h2>Room QR Code</h2>
            <p className="qr-desc">Place at the entrance to check live machine status and queue.</p>
            <div className="qr-preview">
              <QRCodeSVG value={roomQrUrl} size={200} level="M" />
            </div>
            <p className="qr-url">{roomQrUrl}</p>
          </div>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </div>
    );
  }

  // Panel
  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1>Admin Panel 🔐</h1>
          <p className="hostel-label">Hostel: {hostelId}</p>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setScreen('qr')}>📱</button>
          <button className="logout-btn" onClick={handleLogout}>↩</button>
        </div>
      </header>

      <div className="admin-content">
        <div className="stats-row">
          <div className="stat-card"><span className="stat-value">{totalWashes}</span><span className="stat-label">TOTAL WASHES</span></div>
          <div className="stat-card"><span className="stat-value">{avgWait}m</span><span className="stat-label">AVG WAIT</span></div>
        </div>

        <h2 className="section-title">Manage Machines</h2>
        <div className="machine-admin-list">
          {machines.map(m => {
            const isFree = m.status === 'free' || (m.status === 'in-use' && m.end_time && Date.now() >= m.end_time);
            return (
              <div key={m.machine_key} className="machine-admin-card">
                <div className="machine-admin-icon">🧺</div>
                <div className="machine-admin-info">
                  <span className="machine-admin-name">{m.name}</span>
                  <span className="machine-admin-meta">
                    {(m.type || 'washer').toUpperCase()} • <span className={isFree ? 'status-active' : 'status-inuse'}>{isFree ? 'ACTIVE' : 'IN USE'}</span>
                  </span>
                </div>
                <button className="delete-btn" onClick={() => handleDeleteMachine(m.machine_key)}>🗑</button>
              </div>
            );
          })}
        </div>
        <button className="btn btn-add" onClick={handleAddMachine}>+ Add Machine</button>
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
