import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './views/Home';
import ScheduleSelection from './views/ScheduleSelection';
import ScheduleView from './views/ScheduleView';
import Calendar from './views/Calendar';
import Groceries from './views/Groceries';
import Calculator from './views/Calculator';
import Debts from './views/Debts';

// Helper to determine text contrast
const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return 'black';
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#1a1a1a' : '#ffffff';
};

export const applyTheme = (theme, accentColor) => {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.style.setProperty('--theme-bg', '#121212');
    root.style.setProperty('--theme-surface', '#1e1e1e');
    root.style.setProperty('--theme-surface-variant', '#2c2c2c');
    root.style.setProperty('--theme-text', '#ffffff');
    root.style.setProperty('--theme-text-variant', '#aaaaaa');
    root.style.setProperty('--theme-btn-bg', '#2c2c2c');
    root.style.setProperty('--theme-btn-text', '#ffffff');
  } else {
    root.style.setProperty('--theme-bg', '#f5f5f5');
    root.style.setProperty('--theme-surface', '#ffffff');
    root.style.setProperty('--theme-surface-variant', '#e0e0e0');
    root.style.setProperty('--theme-text', '#1a1a1a');
    root.style.setProperty('--theme-text-variant', '#555555');
    root.style.setProperty('--theme-btn-bg', '#e0e0e0');
    root.style.setProperty('--theme-btn-text', '#1a1a1a');
  }

  if (accentColor) {
    root.style.setProperty('--theme-accent', accentColor);
    root.style.setProperty('--theme-accent-text', getContrastYIQ(accentColor));
  }
};

function Sidebar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="app-sidebar">
      <Link to="/" className={`app-sidebar-item ${path === '/' ? 'active' : ''}`} title="Inicio">
        🏠
      </Link>
      <Link to="/schedule" className={`app-sidebar-item ${path.startsWith('/schedule') ? 'active' : ''}`} title="Horarios">
        ⏰
      </Link>
      <Link to="/calendar" className={`app-sidebar-item ${path === '/calendar' ? 'active' : ''}`} title="Calendario">
        📅
      </Link>
      <Link to="/groceries" className={`app-sidebar-item ${path === '/groceries' ? 'active' : ''}`} title="Lista del Súper">
        🛒
      </Link>
      <Link to="/calculator" className={`app-sidebar-item ${path === '/calculator' ? 'active' : ''}`} title="Calculadora">
        🧮
      </Link>
      <Link to="/debts" className={`app-sidebar-item ${path === '/debts' ? 'active' : ''}`} title="Cobrar/Deudas">
        💸
      </Link>
    </aside>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('familyTheme') || 'dark';
    const savedAccent = localStorage.getItem('familyAccent') || '#006493';
    applyTheme(savedTheme, savedAccent);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<ScheduleSelection />} />
            <Route path="/schedule/:person" element={<ScheduleView />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/groceries" element={<Groceries />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/debts" element={<Debts />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
