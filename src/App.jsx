import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LineUp from './pages/LineUp';
import Live from './pages/Live';
import Join from './pages/Join';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Machine QR screens */}
        <Route path="/" element={<Home />} />
        <Route path="/lineup" element={<LineUp />} />
        {/* Room QR screens */}
        <Route path="/queue" element={<Live />} />
        <Route path="/join" element={<Join />} />
        {/* Admin */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}
