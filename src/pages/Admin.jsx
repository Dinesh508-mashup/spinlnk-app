import { useState, useEffect, useCallback } from 'react';
import { getHostelByAdminId, getMachines, addMachine, deleteMachine, getWashHistory, updateHostelQR } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import spinlnkLogo from '../assets/spinlnk-logo.png';
import '../styles/Admin.css';

export default function Admin() {
  const [screen, setScreen] = useState('login');
  const [hostelId, setHostelId] = useState(null);
  const [_HostelName, setHostelName] = useState('');
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
      const now = Date.now();
      machineData.forEach(m => { m._expired = m.status === 'in-use' && m.end_time && now >= m.end_time; });
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

    try {
      const hostel = await getHostelByAdminId(inputId);
      if (!hostel) {
        showToast('Admin ID not found.');
        return;
      }
      if (hostel.password !== password) { showToast('Invalid password.'); return; }
      setHostelName(hostel.hostel_name || hostel.id);
      setHostelId(hostel.id);
      localStorage.setItem('spinlnk_admin_hostel', hostel.id);
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

  const downloadQR = (containerId, filename, title) => {
    const container = document.getElementById(containerId);
    const svg = container.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const W = 600, H = 950;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Teal curved header
    ctx.fillStyle = '#3cc1a2';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 200);
    ctx.quadraticCurveTo(W / 2, 320, 0, 200);
    ctx.closePath();
    ctx.fill();

    // Title text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, 120);

    // QR code
    const qrImg = new Image();
    qrImg.onload = () => {
      // White rounded rect behind QR
      const qrX = 75, qrY = 190, qrW = 450, qrH = 450, r = 20;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(qrX + r, qrY);
      ctx.lineTo(qrX + qrW - r, qrY);
      ctx.quadraticCurveTo(qrX + qrW, qrY, qrX + qrW, qrY + r);
      ctx.lineTo(qrX + qrW, qrY + qrH - r);
      ctx.quadraticCurveTo(qrX + qrW, qrY + qrH, qrX + qrW - r, qrY + qrH);
      ctx.lineTo(qrX + r, qrY + qrH);
      ctx.quadraticCurveTo(qrX, qrY + qrH, qrX, qrY + qrH - r);
      ctx.lineTo(qrX, qrY + r);
      ctx.quadraticCurveTo(qrX, qrY, qrX + r, qrY);
      ctx.closePath();
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw QR
      ctx.drawImage(qrImg, 110, 220, 380, 380);

      // "Scan to update in SpinLnk"
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to update in SpinLnk', W / 2, 700);

      // Load and draw SpinLnk logo
      const logoImg = new Image();
      logoImg.onload = () => {
        const logoW = 200, logoH = 200 * (logoImg.height / logoImg.width);
        ctx.drawImage(logoImg, (W - logoW) / 2, 720, logoW, logoH);

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      logoImg.src = spinlnkLogo;
    };
    qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const baseUrl = window.location.origin;
  const machineQrUrl = `${baseUrl}/home?hostel=${hostelId}&type=machine`;
  const roomQrUrl = `${baseUrl}/queue?hostel=${hostelId}&type=room`;

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
          <img src={spinlnkLogo} alt="SpinLnk" className="login-logo-img" />
          <p className="login-tagline">Laundry intelligence for your hostel</p>

          <form className="login-form" onSubmit={handleLogin}>
            <h2>Welcome Back!</h2>
            <p className="login-sub">Please enter your details to sign in</p>

            <label>ADMIN ID</label>
            <input name="hostelId" placeholder="Enter your Admin ID" required />

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
          <button className="logout-btn" onClick={handleLogout}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
        </header>

        <div className="admin-content">
          <div className="qr-section">
            <h2>Machine QR Code</h2>
            <p className="qr-desc">Residents scan this to book machines directly.</p>
            <div className="qr-preview" id="machine-qr">
              <QRCodeSVG value={machineQrUrl} size={200} level="M" />
            </div>
            <button className="btn btn-add" onClick={() => downloadQR('machine-qr', 'machine-qr.png', 'Washing Machine QR')}>Download QR Code</button>
          </div>

          <div className="qr-section">
            <h2>Room QR Code</h2>
            <p className="qr-desc">Place at the entrance to check live machine status and queue.</p>
            <div className="qr-preview" id="room-qr">
              <QRCodeSVG value={roomQrUrl} size={200} level="M" />
            </div>
            <button className="btn btn-add" onClick={() => downloadQR('room-qr', 'room-qr.png', 'Room QR')}>Download QR Code</button>
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
          <button className="icon-btn" onClick={() => setScreen('qr')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4"/><line x1="22" y1="14" x2="22" y2="18"/><line x1="18" y1="22" x2="22" y2="22"/></svg>
          </button>
          <button className="logout-btn" onClick={handleLogout}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
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
            const statusFree = m.status !== 'in-use' || !m.end_time || m._expired;
            return (
              <div key={m.machine_key} className="machine-admin-card">
                <div className="machine-admin-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3cc1a2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M9.5 13c1-.8 2.5-.8 5 0"/><line x1="6" y1="6" x2="6" y2="6.01"/><line x1="10" y1="6" x2="18" y2="6"/></svg></div>
                <div className="machine-admin-info">
                  <span className="machine-admin-name">{m.name}</span>
                  <span className="machine-admin-meta">
                    {(m.type || 'washer').toUpperCase()} • <span className={statusFree ? 'status-active' : 'status-inuse'}>{statusFree ? 'ACTIVE' : 'IN USE'}</span>
                  </span>
                </div>
                <button className="delete-btn" onClick={() => handleDeleteMachine(m.machine_key)}><svg width="20" height="20" viewBox="0 0 24 24" fill="#e74c3c" stroke="#e74c3c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
              </div>
            );
          })}
        </div>
        <button className="btn btn-add" onClick={handleAddMachine}>+ Add Machine</button>

        <div className="contact-row">
          <a href="tel:+917075194320" className="contact-card">
            <div className="contact-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            </div>
            <h3>Call us</h3>
            <p>Our team is on the line</p>
            <p>Mon-Fri &bull; 9-17</p>
          </a>
          <a href="https://spinlnk-application.vercel.app/" target="_blank" rel="noopener noreferrer" className="contact-card">
            <div className="contact-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            </div>
            <h3>Website</h3>
            <p>Visit our website</p>
            <p>spinlnk-application</p>
          </a>
        </div>
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
