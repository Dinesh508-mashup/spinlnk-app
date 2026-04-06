import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import LineUp from './pages/LineUp';
import Live from './pages/Live';
import Join from './pages/Join';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import Go from './pages/Go';
import TenantLogin from './pages/TenantLogin';
import { registerServiceWorker } from './lib/pushNotifications';
import './App.css';

function RequireHostel({ children }) {
  const location = useLocation();
  const hostelId = new URLSearchParams(window.location.search).get('hostel') || localStorage.getItem('spinlnk_hostel');

  if (hostelId) {
    // Save hostel to localStorage if from QR scan URL
    if (new URLSearchParams(window.location.search).get('hostel')) {
      localStorage.setItem('spinlnk_hostel', hostelId);
      localStorage.setItem('spinlnk_tenant_logged_in', 'true');
    }
    return children;
  }

  // Not logged in — redirect to tenant login with return URL
  const redirectPath = location.pathname + location.search;
  return <Navigate to={`/?redirect=${encodeURIComponent(redirectPath)}`} replace />;
}

export default function App() {
  useEffect(() => { registerServiceWorker(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Tenant login */}
        <Route path="/" element={<TenantLogin />} />
        {/* Machine QR screens (require hostel login) */}
        <Route path="/home" element={<RequireHostel><Home /></RequireHostel>} />
        <Route path="/lineup" element={<RequireHostel><LineUp /></RequireHostel>} />
        {/* Room QR screens (require hostel login) */}
        <Route path="/queue" element={<RequireHostel><Live /></RequireHostel>} />
        <Route path="/join" element={<RequireHostel><Join /></RequireHostel>} />
        {/* Expo Go landing page */}
        <Route path="/go" element={<Go />} />
        {/* Admin */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}
