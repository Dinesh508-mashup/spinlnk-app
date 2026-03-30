import React from 'react';

const Footer: React.FC = () => (
  <footer style={{ background: '#000', padding: '40px 40px 0', fontFamily: "'General Sans', sans-serif", overflow: 'hidden' }}>
    <div className="footer-row" style={{
      border: '1px solid rgba(60,193,162,0.25)', borderRadius: 16,
      padding: '18px 36px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', marginBottom: 16
    }}>
      {[
        { icon: '📞', href: 'tel:+917075194320', text: '+91 7075194320' },
        { icon: '✉️', href: 'mailto:dineshmaganti4@gmail.com', text: 'dineshmaganti4@gmail.com' },
        { icon: '📍', href: null, text: 'Kondapur, Hyderabad — 500084' },
      ].map((item, i) => (
        <p key={i} style={{ color: '#3cc1a2', fontSize: 13, fontWeight: 500 }}>
          {item.icon}{' '}
          {item.href
            ? <a href={item.href} style={{ color: '#3cc1a2', textDecoration: 'none' }}>{item.text}</a>
            : item.text
          }
        </p>
      ))}
    </div>

    <div className="footer-row" style={{
      border: '1px solid rgba(60,193,162,0.25)', borderRadius: 16,
      padding: '18px 36px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', marginBottom: 16
    }}>
      <p style={{ color: '#3cc1a2', fontSize: 13, fontWeight: 500 }}>
        © 2025 Spinlnk — Laundry intelligence for hostels. Made with ❤️ in Hyderabad.
      </p>
      <div className="footer-socials" style={{ display: 'flex', gap: 10 }}>
        {['in', '𝕏', 'ig'].map((s, i) => (
          <a
            key={i}
            href="#"
            style={{
              width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(60,193,162,0.35)',
              color: '#3cc1a2', textDecoration: 'none', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.2s, color 0.2s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(60,193,162,0.7)'; (e.currentTarget as HTMLAnchorElement).style.color = '#3cc1a2'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(60,193,162,0.35)'; (e.currentTarget as HTMLAnchorElement).style.color = '#b07aed'; }}
          >
            {s}
          </a>
        ))}
      </div>
    </div>

    <div className="footer-big-text" style={{
      textAlign: 'center', lineHeight: 0.85, pointerEvents: 'none', userSelect: 'none',
      fontFamily: "'Satoshi', sans-serif", fontWeight: 800,
      fontSize: 'clamp(80px, 16vw, 180px)',
      color: '#d1d5db',
      textShadow: '0 4px 20px rgba(60,193,162,0.5), 0 2px 8px rgba(60,193,162,0.3)'
    }}>
      SpinLnk
    </div>
  </footer>
);

export default Footer;
