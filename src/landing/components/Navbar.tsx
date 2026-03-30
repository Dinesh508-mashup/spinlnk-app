import React, { useEffect, useState } from 'react';

const Navbar: React.FC = () => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handleScroll = () => setHidden(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={hidden ? 'nav-hidden' : ''} style={{ justifyContent: 'center' }}>
      <a href="#" className="logo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <img
          src="/images/Spinlnk logo.png"
          alt="SpinLnk"
          style={{ height: 168, width: 'auto', display: 'block' }}
        />
      </a>
    </nav>
  );
};

export default Navbar;
