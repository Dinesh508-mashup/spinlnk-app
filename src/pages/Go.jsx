import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Go() {
  const [tunnelUrl, setTunnelUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const hostel = params.get('hostel') || '';
  const type = params.get('type') || 'machine';

  useEffect(() => {
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'tunnel_url')
      .single()
      .then(({ data }) => {
        setTunnelUrl(data?.value || '');
        setLoading(false);
      });
  }, []);

  const expoUrl = tunnelUrl
    ? `${tunnelUrl}/--/?hostel=${hostel}&type=${type}`
    : null;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.hint}>Connecting to SpinLnk...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoCircle}>
          <span style={styles.logoIcon}>🧺</span>
        </div>
        <h1 style={styles.title}>SpinLnk</h1>
        <p style={styles.subtitle}>Laundry made simple</p>

        {tunnelUrl ? (
          <>
            <a href={expoUrl} style={styles.button}>
              Open in Expo Go
            </a>
            <p style={styles.hint}>
              Don't have Expo Go? Download it first:
            </p>
          </>
        ) : (
          <>
            <div style={styles.offlineBox}>
              <span style={styles.offlineIcon}>⚠️</span>
              <p style={styles.offlineText}>
                The app server is currently offline. Please try again later.
              </p>
            </div>
            <p style={styles.hint}>
              In the meantime, download Expo Go:
            </p>
          </>
        )}

        <div style={styles.storeLinks}>
          <a
            href="https://apps.apple.com/app/expo-go/id982107779"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.storeLink}
          >
            📱 App Store (iOS)
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=host.exp.exponent"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.storeLink}
          >
            🤖 Play Store (Android)
          </a>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Scan this QR code at your hostel to manage laundry machines
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f8fafb 0%, #e8f4f8 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 24,
    padding: '40px 32px',
    maxWidth: 400,
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    background: '#1a365d',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 4px 16px rgba(26,54,93,0.25)',
  },
  logoIcon: { fontSize: 36 },
  title: { fontSize: 32, fontWeight: 800, color: '#1a365d', margin: '0 0 4px' },
  subtitle: { color: '#718096', marginBottom: 32, fontSize: 16 },
  button: {
    display: 'block',
    background: '#38b2ac',
    color: '#fff',
    padding: '16px 24px',
    borderRadius: 14,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 17,
    marginBottom: 24,
    transition: 'background 0.2s',
  },
  offlineBox: {
    background: '#fff5f5',
    borderRadius: 12,
    padding: '16px 20px',
    marginBottom: 24,
    border: '1px solid #fed7d7',
  },
  offlineIcon: { fontSize: 24, marginBottom: 8, display: 'block' },
  offlineText: { color: '#c53030', fontWeight: 600, margin: 0, fontSize: 14 },
  hint: { color: '#a0aec0', fontSize: 14, marginBottom: 16 },
  storeLinks: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  storeLink: {
    color: '#38b2ac',
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTop: '1px solid #edf2f7',
  },
  footerText: { color: '#a0aec0', fontSize: 12, margin: 0 },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #e2e8f0',
    borderTopColor: '#38b2ac',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
};
