import React, { useRef, useEffect } from 'react';

const features = [
  { icon: '📱', title: 'QR Scan to Start', text: 'Scan the QR on the machine. Enter your name, pick your cycle. Timer starts, machine is claimed. Done.', delay: 'd1' },
  { icon: '🔔', title: 'Smart Reminders', text: 'Get notified 5 min before done, at completion, and again at +10 min if you forget to collect.', delay: 'd2' },
  { icon: '📋', title: 'Queue & Book Slots', text: 'Check machine status from your bed. Join a queue and get pinged the moment it\'s free.', delay: 'd3' },
  { icon: '🌧️', title: 'Rain Weather Alerts', text: 'Live weather integration. We warn you when rain is coming so your clothes don\'t end up wet outside.', delay: 'd1' },
  { icon: '🤝', title: '"I Moved Your Clothes"', text: 'Someone moved your laundry? They log it and you get a calm, dignified notification. No confrontation.', delay: 'd2' },
  { icon: '📊', title: 'Admin Dashboard', text: 'Hostel owners get usage logs, peak hour charts and machine health stats in one clean view.', delay: 'd3' },
];

const FeatureCard: React.FC<typeof features[0]> = ({ icon, title, text, delay }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${delay}`} style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
      padding: '40px 32px', textAlign: 'center', transition: 'transform .3s, box-shadow .3s',
      position: 'relative', overflow: 'hidden', cursor: 'default'
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 18px 40px rgba(0,0,0,.09)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      <span style={{ fontSize: 44, marginBottom: 20, display: 'block' }}>{icon}</span>
      <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--blue)', marginBottom: 10 }}>{title}</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>{text}</p>
    </div>
  );
};

const FeaturesSection: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" style={{ background: 'var(--light)', padding: '90px 60px' }}>
      <div ref={headerRef} className="reveal" style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 60px' }}>
        <div className="sec-label">/ How It Works</div>
        <div className="sec-eyebrow">We think ahead</div>
        <h2 className="sec-title">Smart laundry coordination, <em>zero drama.</em></h2>
      </div>
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, maxWidth: 1100, margin: '0 auto' }}>
        {features.map((f, i) => <FeatureCard key={i} {...f} />)}
      </div>
    </section>
  );
};

export default FeaturesSection;
