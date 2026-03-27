import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Queue from './pages/Queue';
import Admin from './pages/Admin';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
