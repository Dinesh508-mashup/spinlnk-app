import React from 'react';

const Hero: React.FC = () => {
  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      <video
        autoPlay muted loop playsInline
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      >
        <source src="./videos/washing machine.mp4" type="video/mp4" />
      </video>
      <div className="hero-overlay" style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: "url('./images/Group2.png')",
        backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%', backgroundPosition: 'center',
        zIndex: 2, pointerEvents: 'none',
        animation: 'cloudPulse 6s ease-in-out 2', transformOrigin: 'center center'
      }} />
    </section>
  );
};

export default Hero;
