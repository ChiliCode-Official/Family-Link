import React, { useEffect, Component } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { safeStorage } from './services/storage';
import Home from './views/Home';
import ScheduleSelection from './views/ScheduleSelection';
import ScheduleView from './views/ScheduleView';
import Calendar from './views/Calendar';
import Groceries from './views/Groceries';
import ToDo from './views/ToDo';
import Calculator from './views/Calculator';
import Debts from './views/Debts';

// React Error Boundary to prevent blank/grey screen crashes on iOS Safari
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Family Link Error caught by boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#121212',
          color: '#ffffff',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
          <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Family Link</h1>
          <p style={{ fontSize: '15px', color: '#aaaaaa', margin: '0 0 24px 0', maxWidth: '320px' }}>
            Hubo un detalle al cargar la aplicación. Presiona el botón para reanudar.
          </p>
          <button 
            onClick={this.handleReload}
            style={{
              padding: '12px 28px',
              borderRadius: '24px',
              backgroundColor: '#006493',
              color: '#ffffff',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Recargar Aplicación
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  try {
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
  } catch (e) {
    console.warn("Error applying theme:", e);
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
      <Link to="/todo" className={`app-sidebar-item ${path === '/todo' ? 'active' : ''}`} title="To Do">
        📝
      </Link>
      <Link to="/debts" className={`app-sidebar-item ${path === '/debts' ? 'active' : ''}`} title="Cobrar/Deudas">
        💸
      </Link>
      <Link to="/calculator" className={`app-sidebar-item ${path === '/calculator' ? 'active' : ''}`} title="Calculadora">
        🧮
      </Link>
    </aside>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = safeStorage.get('familyTheme', 'dark');
    const savedAccent = safeStorage.get('familyAccent', '#006493');
    applyTheme(savedTheme, savedAccent);
  }, []);

  return (
    <ErrorBoundary>
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
              <Route path="/todo" element={<ToDo />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/calculator" element={<Calculator />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
