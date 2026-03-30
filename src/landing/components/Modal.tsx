import React, { useEffect } from 'react';
import type { ModalData } from '../types';

interface ModalProps {
  data: ModalData | null;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ data, onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = data ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [data]);

  if (!data) return null;

  const rawNum = data.contact.replace(/\D/g, '');

  const infoRows = [
    { icon: '🏠', label: 'Hostel', value: data.name },
    { icon: '👤', label: 'Owner', value: data.owner },
    { icon: '📍', label: 'Location', value: data.location },
    { icon: '📞', label: 'Contact', value: data.contact },
  ];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 24, padding: '40px 36px 36px',
        width: '100%', maxWidth: 480, position: 'relative',
        animation: 'modalIn .25s ease'
      }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(20px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}`}</style>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 18, right: 22, background: 'none', border: 'none', fontSize: 22, color: '#aaa', cursor: 'pointer', lineHeight: 1 }}
        >×</button>
        <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 28, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>
          Enquire &amp; Book
        </div>
        <div style={{ color: '#e74c3c', fontFamily: "'General Sans', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 28 }}>
          {data.name}
        </div>
        {infoRows.map((row, i) => (
          <div key={i} style={{
            background: '#f0faf4', borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{row.icon}</span>
            <div>
              <div style={{ fontFamily: "'General Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>{row.label}</div>
              <div style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 700, fontSize: 15, color: '#1a2744' }}>{row.value}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
          <button
            onClick={() => window.location.href = `tel:+${rawNum}`}
            style={{
              flex: 1, padding: 16, background: '#1a2744', color: '#fff', border: 'none',
              borderRadius: 50, fontFamily: "'General Sans', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer'
            }}
          >📞 Call Now</button>
          <a
            href={`https://wa.me/${rawNum}`}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1, padding: 16, background: '#25d366', color: '#fff', border: 'none',
              borderRadius: 50, fontFamily: "'General Sans', sans-serif", fontWeight: 700, fontSize: 15,
              cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >💬 WhatsApp</a>
        </div>
      </div>
    </div>
  );
};

export default Modal;
