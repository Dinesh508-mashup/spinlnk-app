import React from 'react';

const SliderSection: React.FC = () => {
  return (
    <section style={{ background: '#ffffff', padding: '80px 40px 60px', textAlign: 'center' }}>
      <div className="slider-images" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: 1100, margin: '0 auto 48px auto', gap: 0
      }}>
        {[
          { src: './images/slider-image-2.png', alt: 'Clothes loaded into washer' },
          { src: './images/slider-image-1.png', alt: 'Full drum of colourful laundry' },
          { src: './images/slider-image-3.png', alt: 'Drum spinning at speed' },
        ].map((img, i) => (
          <div key={i} style={{ flex: 1, position: 'relative' }}>
            <img src={img.src} alt={img.alt} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 10, margin: '0 auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 className="slider-title" style={{
          fontFamily: "'Satoshi', sans-serif", fontSize: 'clamp(36px, 5vw, 64px)',
          fontWeight: 800, lineHeight: 1.1, color: '#1a1a2e', marginBottom: 16, letterSpacing: -0.5, whiteSpace: 'nowrap'
        }}>
          Your laundry, <span style={{ color: 'var(--teal)' }}>finally sorted.</span>
        </h1>
        <p className="slider-desc" style={{ fontSize: 18, color: '#777', lineHeight: 1.7, maxWidth: 800, margin: '0 auto', fontWeight: 400 }}>
          No more wet clothes dumped on the floor. No more guessing if the machine is free. SpinLnk brings smart washing machine coordination to hostels across India.
        </p>
      </div>
    </section>
  );
};

export default SliderSection;
