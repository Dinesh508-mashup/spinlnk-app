import React from 'react';

const items = [
  { icon: '✅', title: 'Guaranteed Service', sub: 'Your slot, your time — always honoured' },
  { icon: '💰', title: 'Affordable Price', sub: 'Free for residents, fair for owners' },
  { icon: '📲', title: 'QR Scan & Go', sub: 'No app download. Just scan & start.' },
];

const IconStrip: React.FC = () => (
  <div style={{ background: '#fff', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 18, padding: '36px 48px',
            borderRight: i < items.length - 1 ? '1px solid var(--border)' : 'none'
          }}
        >
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: 'linear-gradient(135deg,rgba(58,181,176,.12),rgba(26,60,94,.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, flexShrink: 0
          }}>
            {item.icon}
          </div>
          <div>
            <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--blue)', marginBottom: 3 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default IconStrip;
