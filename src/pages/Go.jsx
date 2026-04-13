import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Go() {
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState('launching'); // 'launching' | 'manual'
  const didLeave = useRef(false);

  const hostel = searchParams.get('hostel') || '';
  const type = searchParams.get('type') || 'machine';
  const path = type === 'room' ? 'queue' : 'home';
  const deepLink = `spinlnk://${path}?hostel=${encodeURIComponent(hostel)}&type=${encodeURIComponent(type)}`;

  useEffect(() => {
    if (!hostel) return;

    // Track if the browser loses focus (means deep link worked)
    const onVisChange = () => { if (document.hidden) didLeave.current = true; };
    const onBlur = () => { didLeave.current = true; };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);

    // Attempt 1: iframe trick (works on Android Chrome without showing error)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = deepLink;
    document.body.appendChild(iframe);

    // Attempt 2: direct location (catches iOS Safari + other browsers)
    setTimeout(() => {
      if (!didLeave.current) {
        window.location.href = deepLink;
      }
    }, 100);

    // After 2s, if still here, show manual button
    const fallbackTimer = setTimeout(() => {
      if (!didLeave.current) {
        setPhase('manual');
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };
  }, [hostel, deepLink]);

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Phase 1: Auto-launching
  if (phase === 'launching') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <h2 style={styles.title}>SpinLnk</h2>
          <p style={styles.text}>Opening app...</p>
        </div>
      </div>
    );
  }

  // Phase 2: Manual — auto-launch didn't work, show tap button
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoCircle}>
          <span style={styles.logoEmoji}>🧺</span>
        </div>
        <h2 style={styles.title}>SpinLnk</h2>
        <p style={styles.subtitle}>Laundry made simple</p>

        {/* Primary CTA — tappable link is more reliable than JS redirect on iOS */}
        <a href={deepLink} style={styles.openBtn}>
          Open in App
        </a>

        {isIOS && (
          <p style={styles.iosHint}>
            On iPhone, tap <strong>Open</strong> when Safari asks to open SpinLnk.
          </p>
        )}

        <div style={styles.divider} />

        <p style={styles.setupTitle}>First time?</p>
        <p style={styles.setupText}>
          1. Open <strong>Expo Go</strong> on your phone<br />
          2. Connect to your hostel's SpinLnk server<br />
          3. Then scan this QR code again
        </p>

        <div style={styles.storeRow}>
          <a
            href="https://apps.apple.com/app/expo-go/id982107779"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.storeLink}
          >
            iOS App Store
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=host.exp.exponent"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.storeLink}
          >
            Google Play
          </a>
        </div>
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
    padding: '40px 28px',
    textAlign: 'center',
    maxWidth: 380,
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
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    background: '#0d9488',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
  },
  logoEmoji: { fontSize: 32 },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 24px',
  },
  text: {
    fontSize: 16,
    color: '#374151',
    margin: '0 0 8px',
  },
  openBtn: {
    display: 'block',
    background: '#0d9488',
    color: '#fff',
    padding: '16px 24px',
    borderRadius: 14,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 17,
    marginBottom: 12,
  },
  iosHint: {
    fontSize: 13,
    color: '#6b7280',
    margin: '0 0 0',
    lineHeight: '1.5',
  },
  divider: {
    height: 1,
    background: '#e5e7eb',
    margin: '24px 0',
  },
  setupTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#374151',
    margin: '0 0 8px',
  },
  setupText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: '1.7',
    margin: '0 0 16px',
    textAlign: 'left',
  },
  storeRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
  },
  storeLink: {
    color: '#0d9488',
    fontWeight: 600,
    fontSize: 13,
    textDecoration: 'none',
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
  },
};
