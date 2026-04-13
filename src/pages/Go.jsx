import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const DEEP_LINK_TIMEOUT = 1500; // ms to wait before falling back to web

export default function Go() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('redirecting'); // 'redirecting' | 'fallback'

  const hostel = searchParams.get('hostel');
  const type = searchParams.get('type') || 'machine';

  useEffect(() => {
    if (!hostel) {
      navigate('/', { replace: true });
      return;
    }

    // Build the deep link URL (spinlnk:// custom scheme)
    const path = type === 'room' ? 'queue' : 'home';
    const deepLink = `spinlnk://${path}?hostel=${encodeURIComponent(hostel)}&type=${encodeURIComponent(type)}`;

    // Build the web fallback URL
    const webFallback = `/${path}?hostel=${encodeURIComponent(hostel)}&type=${encodeURIComponent(type)}`;

    // Track if user left the page (deep link opened the app)
    let didLeave = false;
    const onBlur = () => { didLeave = true; };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) didLeave = true;
    });

    // Try opening the deep link
    window.location.href = deepLink;

    // Fallback: if the app didn't open after timeout, redirect to web
    const timer = setTimeout(() => {
      if (!didLeave) {
        setStatus('fallback');
        navigate(webFallback, { replace: true });
      }
    }, DEEP_LINK_TIMEOUT);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('blur', onBlur);
    };
  }, [hostel, type, navigate]);

  // Minimal loading UI shown during the deep link attempt
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <h2 style={styles.title}>SpinLnk</h2>
        <p style={styles.text}>
          {status === 'redirecting'
            ? 'Opening app...'
            : 'Redirecting to web...'}
        </p>
        <p style={styles.hint}>
          {status === 'redirecting'
            ? "If the app doesn't open, you'll be redirected automatically."
            : null}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #e5e7eb',
    borderTopColor: '#0d9488',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 20px',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 8px',
  },
  text: {
    fontSize: 16,
    color: '#374151',
    margin: '0 0 8px',
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af',
    margin: 0,
  },
};
