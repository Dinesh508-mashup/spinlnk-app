import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getHostelByLoginId } from '../lib/supabase';
import spinlnkLogo from '../assets/spinlnk-logo.png';

export default function TenantLogin() {
  const [hostelInput, setHostelInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/home';

  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmed = hostelInput.trim();
    if (!trimmed) { setError('Please enter your Hostel ID'); return; }

    setLoading(true);
    setError('');

    try {
      const hostel = await getHostelByLoginId(trimmed);

      if (!hostel) {
        setError('Hostel not found. Please check your Hostel ID.');
        setLoading(false);
        return;
      }

      // Save tenant session
      localStorage.setItem('spinlnk_hostel', hostel.id);
      localStorage.setItem('spinlnk_tenant_logged_in', 'true');

      // Redirect to the intended page
      const targetUrl = redirect.includes('?') ? `${redirect}&hostel=${hostel.id}` : `${redirect}?hostel=${hostel.id}`;
      navigate(targetUrl, { replace: true });
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafb 0%, #eef2f5 60%, #e0e8ed 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: '#1a5276', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, boxShadow: '0 8px 30px rgba(26,82,118,0.25)',
      }}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="3"/>
          <circle cx="12" cy="14" r="5"/>
          <path d="M9.5 13c1-.8 2.5-.8 5 0"/>
          <line x1="6" y1="6" x2="6" y2="6.01"/>
          <line x1="10" y1="6" x2="18" y2="6"/>
        </svg>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a5276', marginBottom: 4 }}>SpinLnk</h1>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50', marginBottom: 6 }}>Welcome Tenant</h2>
      <p style={{ fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 32, maxWidth: 280 }}>
        Your personal laundry concierge is ready for you.
      </p>

      {/* Login Form */}
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
        <label style={{
          display: 'block', fontSize: 13, fontWeight: 700, color: '#2c3e50',
          marginBottom: 8, letterSpacing: 0.3,
        }}>
          Hostel Email / ID
        </label>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', borderRadius: 14, padding: '14px 16px',
          border: '1.5px solid #dde4ee', marginBottom: 8,
          transition: 'border-color 0.2s',
        }}>
          <span style={{ fontSize: 18, color: '#7f8c8d' }}>@</span>
          <input
            type="text"
            value={hostelInput}
            onChange={e => { setHostelInput(e.target.value); setError(''); }}
            placeholder="Enter your hostel ID"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15,
              fontFamily: "'DM Sans', sans-serif", color: '#2c3e50', background: 'transparent',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#e74c3c', fontSize: 13, marginBottom: 8 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '18px', border: 'none', borderRadius: 50,
            background: '#1a5276', color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: 12,
            fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3,
            opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Connecting...' : 'Login to SpinLnk'}
        </button>
      </form>

      {/* Stats Card */}
      <div style={{
        marginTop: 32, background: '#e8eef3', borderRadius: 18, padding: '20px 24px',
        width: '100%', maxWidth: 360, textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a5276" stroke="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </span>
          <span style={{
            width: 32, height: 32, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a5276" stroke="none"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7z"/></svg>
          </span>
          <span style={{
            width: 32, height: 32, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#e74c3c" stroke="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
          </span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1a5276', lineHeight: 1.4 }}>
          Managing 24,000+ Wash Cycles Monthly
        </p>
      </div>
    </div>
  );
}
