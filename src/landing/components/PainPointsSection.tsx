import React, { useRef, useEffect } from 'react';

const cards = [
  { img: '/images/Clothes on the Floor.jpg', title: '😤 Clothes on the Floor', desc: 'Someone always removes wet laundry without warning. Awkward and avoidable.', delay: 'd1' },
  { img: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&q=80&auto=format', title: '🕐 No Idea When It\'s Free', desc: 'Walk down 3 floors to find 40 minutes still on the clock.', delay: 'd2' },
  { img: '/images/Clothes Left Wet.jpg', title: '🌧️ Clothes Left Wet', desc: 'You forgot about the rain. Your fresh laundry\'s been soaking since noon.', delay: 'd3' },
  { img: '/images/no accountability.jpg', title: '😶 No Accountability', desc: 'Everyone uses it. Nobody owns it. Classic tragedy of the commons.', delay: 'd4' },
];

const PainPointsSection: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const targets = [headerRef.current, ...cardRefs.current].filter(Boolean) as HTMLDivElement[];
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }); },
      { threshold: 0.12 }
    );
    targets.forEach(t => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{ background: '#fff', padding: '90px 40px' }}>
      <div ref={headerRef} className="reveal" style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto 52px' }}>
        <div className="sec-label">/ Pain Points Solved</div>
        <div className="sec-eyebrow">The real problems</div>
        <h2 className="sec-title">Why hostellers <em>need this.</em></h2>
      </div>
      <div className="pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
        {cards.map((card, i) => (
          <div
            key={i}
            ref={el => { cardRefs.current[i] = el; }}
            className={`reveal ${card.delay} pain-card`}
            style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', height: 310, cursor: 'pointer' }}
          >
            <img
              src={card.img}
              alt={card.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .5s ease', display: 'block' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top,rgba(26,60,94,.88) 0%,rgba(26,60,94,.15) 60%,transparent 100%)',
            }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px' }}>
              <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 6 }}>{card.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.78)', lineHeight: 1.65 }}>{card.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PainPointsSection;
