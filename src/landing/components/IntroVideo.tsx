import React, { useRef, useState, useEffect } from 'react';

interface Props {
  onEnd: () => void;
}

const IntroVideo: React.FC<Props> = ({ onEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      setMuted(true);
      video.play();
    });
  }, []);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <video
        ref={videoRef}
        playsInline
        onEnded={onEnd}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src="/videos/Spinlnk Demo.mp4" type="video/mp4" />
      </video>

      <button
        className="intro-btn-sound"
        onClick={toggleSound}
        style={{
          position: 'absolute', bottom: 40, left: 40,
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
          padding: '10px 20px', borderRadius: 30,
          fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 18,
          cursor: 'pointer', transition: 'background .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <button
        className="intro-btn-skip"
        onClick={onEnd}
        style={{
          position: 'absolute', bottom: 40, right: 40,
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
          padding: '10px 28px', borderRadius: 30,
          fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 14,
          cursor: 'pointer', letterSpacing: 0.5, transition: 'background .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
      >
        Skip
      </button>
    </div>
  );
};

export default IntroVideo;
