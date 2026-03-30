import React, { useState } from 'react';

const checkItems = [
  'Know exactly when a machine is free — from your room',
  'Smart reminders before, at completion & if clothes are left',
  'Dignified "I moved your clothes" notifications — no conflict',
  'Rain alerts so outdoor laundry is never ruined',
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', border: '1.5px solid #dde4ee',
  borderRadius: 8, fontSize: 14, fontFamily: "'General Sans', sans-serif",
  outline: 'none', transition: 'border-color .2s',
};

const AboutSection: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ hostelName: '', location: '', rooms: '', contact: '', ownerName: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => { setShowForm(false); setSubmitted(false); setForm({ hostelName: '', location: '', rooms: '', contact: '', ownerName: '' }); }, 2000);
  };

  return (
    <section id="about" style={{ background: '#fff', overflow: 'hidden' }}>
      {/* Image area with decorative elements */}
      <div style={{ position: 'relative', maxWidth: 950, margin: '0 auto', padding: '80px 40px 50px' }}>
        <div style={{
          width: '100%', margin: '0 auto',
          borderRadius: '200px / 160px', overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)', position: 'relative', zIndex: 1
        }}>
          <video
            src="/videos/spinlnk-hostel-demo.webm"
            autoPlay
            loop
            muted
            playsInline
            className="about-image"
            style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>

      {/* Heading */}
      <div className="about-heading" style={{ background: '#fff', padding: '44px 40px', textAlign: 'center' }}>
        <div style={{
          fontFamily: "'General Sans', sans-serif", fontSize: 11, letterSpacing: 3,
          textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 700, marginBottom: 10
        }}>/ About Me</div>
        <h2 style={{
          fontFamily: "'Satoshi', sans-serif", fontWeight: 700,
          fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.15, color: 'var(--blue)', margin: 0
        }}>
          Why choose <span style={{ color: 'var(--teal)', fontStyle: 'italic' }}>SpinLnk?</span>
        </h2>
      </div>

      {/* Description + Check items + CTA */}
      <div className="about-content" style={{ background: '#fff', textAlign: 'center', padding: '40px 40px 60px' }}>
        <p style={{
          fontSize: 16, color: '#556', lineHeight: 1.8,
          maxWidth: 640, margin: '0 auto 32px', fontWeight: 400
        }}>
          Every hostel has the same problem — shared machines, forgotten clothes, silent conflict. We built a lightweight web app that brings real coordination to laundry rooms across India. No installs. No drama. Just scan and go.
        </p>
        <div className="about-checks" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 40px',
          maxWidth: 700, margin: '0 auto 36px', textAlign: 'left'
        }}>
          {checkItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              fontSize: 14, color: '#556', lineHeight: 1.7
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--teal)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1
              }}>✓</span>
              {item}
            </div>
          ))}
        </div>
        <div className="about-buttons" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <a href="#features" className="btn-outline">See How It Works →</a>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '12px 30px', background: 'var(--teal)', color: '#fff',
              border: 'none', borderRadius: 4, fontFamily: "'General Sans', sans-serif",
              fontWeight: 700, fontSize: 13, letterSpacing: .5, cursor: 'pointer',
              transition: 'background .25s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2f9e99')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3ab5b0')}
          >
            Contact Us
          </button>
        </div>
      </div>

      {/* Contact Form Popup */}
      {showForm && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16
          }}
        >
          <div className="contact-modal" style={{
            background: '#fff', borderRadius: 20, padding: '36px 32px',
            width: '100%', maxWidth: 460, position: 'relative',
            animation: 'modalIn .25s ease'
          }}>
            <style>{`@keyframes modalIn{from{opacity:0;transform:translateY(20px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}`}</style>
            <button
              onClick={() => setShowForm(false)}
              style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 22, color: '#aaa', cursor: 'pointer', lineHeight: 1 }}
            >×</button>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontFamily: "'General Sans', sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--blue)' }}>
                  Thank you!
                </div>
                <p style={{ color: '#777', fontSize: 14, marginTop: 8 }}>We'll get back to you soon.</p>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>
                  Get in Touch
                </div>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Tell us about your hostel</p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input name="hostelName" value={form.hostelName} onChange={handleChange} placeholder="Hostel Name" required style={inputStyle} />
                  <select name="location" value={form.location} onChange={handleChange as unknown as React.ChangeEventHandler<HTMLSelectElement>} required style={{ ...inputStyle, color: form.location ? '#333' : '#999', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23999\' stroke-width=\'1.5\' fill=\'none\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
                    <option value="" disabled>Select City</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Pune">Pune</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Jaipur">Jaipur</option>
                    <option value="Lucknow">Lucknow</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Indore">Indore</option>
                    <option value="Kochi">Kochi</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Visakhapatnam">Visakhapatnam</option>
                    <option value="Nagpur">Nagpur</option>
                    <option value="Bhopal">Bhopal</option>
                    <option value="Mysore">Mysore</option>
                    <option value="Goa">Goa</option>
                    <option value="Dehradun">Dehradun</option>
                    <option value="Varanasi">Varanasi</option>
                    <option value="Mangalore">Mangalore</option>
                    <option value="Vijayawada">Vijayawada</option>
                    <option value="Tirupati">Tirupati</option>
                    <option value="Other">Other</option>
                  </select>
                  <input name="rooms" value={form.rooms} onChange={handleChange} placeholder="No. of Rooms" type="number" required style={inputStyle} />
                  <input name="contact" value={form.contact} onChange={handleChange} placeholder="Contact Number" type="tel" required style={inputStyle} />
                  <input name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Owner Name" required style={inputStyle} />
                  <button type="submit" style={{
                    padding: '14px', background: 'var(--teal)', color: '#fff', border: 'none',
                    borderRadius: 8, fontFamily: "'General Sans', sans-serif", fontWeight: 700,
                    fontSize: 15, cursor: 'pointer', marginTop: 6, transition: 'background .2s'
                  }}>
                    Submit
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default AboutSection;
