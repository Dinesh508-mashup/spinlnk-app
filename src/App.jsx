import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import LineUp from './pages/LineUp';
import Live from './pages/Live';
import Join from './pages/Join';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import LandingPage from './landing/LandingPage';
import './App.css';

function RequireHostel({ children }) {
  const hostelId = new URLSearchParams(window.location.search).get('hostel') || localStorage.getItem('spinlnk_hostel');
  if (!hostelId) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />
        {/* Machine QR screens (require hostel) */}
        <Route path="/home" element={<RequireHostel><Home /></RequireHostel>} />
        <Route path="/lineup" element={<RequireHostel><LineUp /></RequireHostel>} />
        {/* Room QR screens */}
        <Route path="/queue" element={<RequireHostel><Live /></RequireHostel>} />
        <Route path="/join" element={<RequireHostel><Join /></RequireHostel>} />
        {/* Admin */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}
