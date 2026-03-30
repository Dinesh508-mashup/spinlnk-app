import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { HostelData } from '../types';


const hostels: HostelData[] = [
  { name: 'The Nest Hostel', owner: 'Ravi Shankar', area: 'Banjara Hills', city: 'Hyderabad', machines: 2, rooms: 40, contact: '+91 98490 12345', lat: 17.4126, lng: 78.4482 },
  { name: 'Bunk & Beyond', owner: 'Priya Nair', area: 'Madhapur', city: 'Hyderabad', machines: 3, rooms: 45, contact: '+91 99000 56789', lat: 17.4474, lng: 78.3915 },
  { name: 'Studio Stay HYD', owner: 'Arjun Reddy', area: 'Kondapur', city: 'Hyderabad', machines: 2, rooms: 35, contact: '+91 91234 00000', lat: 17.4720, lng: 78.3639 },
];

const totalMachines = hostels.reduce((sum, h) => sum + h.machines, 0);
const totalRoomsStickered = hostels.reduce((sum, h) => sum + h.rooms, 0);

const CIRCLE_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CircleCounter: React.FC<{ value: number; max: number; label: string; suffix?: string; progress: number }> = ({ value, label, suffix, progress }) => {
  const offset = CIRCUMFERENCE - progress * CIRCUMFERENCE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
        <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
            fill="none" stroke="#e8ecf1" strokeWidth={STROKE_WIDTH} />
          <circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
            fill="none" stroke="#3cc1a2" strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 38, color: 'var(--blue)', letterSpacing: 2
        }}>
          {value}{suffix && <span style={{ fontSize: 20 }}>{suffix}</span>}
        </div>
      </div>
      <div style={{
        fontFamily: "'General Sans', sans-serif", fontSize: 12, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.5
      }}>{label}</div>
    </div>
  );
};

const CounterStrip: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const start = performance.now();
        const animate = (now: number) => {
          const p = Math.min((now - start) / 2000, 1);
          setProgress(p);
          if (p < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.unobserve(el);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={stripRef} className="counter-strip" style={{
      display: 'inline-flex', gap: 48, marginTop: 30, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 8
    }}>
      <CircleCounter value={Math.floor(progress * 3)} max={3} label="Hostels" progress={progress} />
      <CircleCounter value={Math.floor(progress * totalMachines)} max={totalMachines} label="Washing Machines Integrated" progress={progress} />
      <CircleCounter value={Math.floor(progress * totalRoomsStickered)} max={totalRoomsStickered} label="Hostel Rooms Stickered" progress={progress} />
      <CircleCounter value={1} max={1} label="Avg Setup Time" suffix="m" progress={progress} />
    </div>
  );
};

const HostelSection: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [17.4440, 78.3950],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 30 12 30S28 21 28 12C28 5.373 22.627 0 16 0z" fill="#e53935" stroke="#b71c1c" stroke-width="1.5"/>
      <circle cx="16" cy="12" r="5" fill="white"/>
    </svg>`;

    const customIcon = L.divIcon({
      html: pinSvg,
      className: '',
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -44],
    });

    hostels.forEach((h) => {
      const marker = L.marker([h.lat, h.lng], { icon: customIcon }).addTo(map);
      marker.bindTooltip(
        `<div style="font-family:'General Sans',sans-serif;font-weight:700;font-size:12px;color:#1a3c5e;white-space:nowrap;">Spinlnk</div>`,
        { permanent: true, direction: 'top', offset: [0, -44], className: 'spinlnk-label' }
      ).openTooltip();
      marker.bindPopup(
        `<div style="font-family:'General Sans',sans-serif;text-align:center;">
          <div style="font-weight:800;font-size:14px;color:#e53935;margin-bottom:4px;">Spinlnk</div>
          <div style="font-size:12px;color:#1a3c5e;">${h.name} — ${h.area}</div>
        </div>`,
        { closeButton: false }
      );
      marker.on('click', () => marker.openPopup());
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <section id="hostels" style={{ background: '#f7f9fc', padding: '80px 40px' }}>
      <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 50px' }}>
        <div className="sec-label">/ Coverage</div>
        <h2 className="sec-title">Hostels on <em>our network</em></h2>
        <p className="sec-text">Integrated hostels — Book a stay at a SpinLnk hostel</p>
        <CounterStrip />
      </div>

      <div style={{ maxWidth: 1200, margin: 'auto', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
        <div ref={mapRef} className="hostel-map" style={{ width: '100%', height: 600 }} />
      </div>
    </section>
  );
};

export default HostelSection;
