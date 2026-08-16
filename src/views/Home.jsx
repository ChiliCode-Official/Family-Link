import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { applyTheme } from '../App';
import '../styles/payment-alert.css';

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState(localStorage.getItem('familyNickname') || '');
  const [isPromptingNickname, setIsPromptingNickname] = useState(false);
  const [hasPendingDebts, setHasPendingDebts] = useState(false);
  const [pendingDebtCount, setPendingDebtCount] = useState(0);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(localStorage.getItem('familyTheme') || 'light');
  const [accentColor, setAccentColor] = useState(localStorage.getItem('familyAccent') || '#006493');

  // Month selector
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [events, setEvents] = useState([]);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const shortMonthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser && !localStorage.getItem('familyNickname')) {
        setIsPromptingNickname(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!nickname) return;
    
    // Check for pending debts
    const qDebts = query(collection(db, 'debts'), where('debtor', '==', nickname));
    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      setHasPendingDebts(!snapshot.empty);
      setPendingDebtCount(snapshot.size);
    });

    return () => {
      unsubDebts();
    };
  }, [nickname]);

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const monthEvents = allEvents.filter(e => {
        if (!e.dateMs) return false;
        const d = new Date(e.dateMs);
        return d.getMonth() === selectedMonth && d.getFullYear() === new Date().getFullYear();
      });
      setEvents(monthEvents.sort((a, b) => a.dateMs - b.dateMs));
    });
    return () => unsubEvents();
  }, [selectedMonth]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('familyNickname');
      setNickname('');
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const saveNickname = () => {
    if (nickname.trim()) {
      localStorage.setItem('familyNickname', nickname.trim());
      setIsPromptingNickname(false);
    }
  };

  const handleSaveTheme = () => {
    localStorage.setItem('familyTheme', themeMode);
    localStorage.setItem('familyAccent', accentColor);
    applyTheme(themeMode, accentColor);
    setIsSettingsOpen(false);
  };

  const today = new Date();
  
  const getDaysForCarousel = () => {
    const isCurrentMonth = selectedMonth === today.getMonth();
    const startDay = isCurrentMonth ? today.getDate() : 1;
    const daysInMonth = new Date(new Date().getFullYear(), selectedMonth + 1, 0).getDate();
    
    let days = [];
    for (let i = 0; i < 6; i++) {
      let d = startDay + i;
      if (d <= daysInMonth) {
        days.push({
          number: d,
          name: shortMonthNames[selectedMonth],
          isToday: isCurrentMonth && d === today.getDate()
        });
      }
    }
    return days;
  };

  const carouselDays = getDaysForCarousel();
  const nextEvent = events.length > 0 ? events[0] : null;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, backgroundColor: 'var(--theme-bg, var(--md-sys-color-background))' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--theme-text, var(--md-sys-color-on-background))' }}>Hola, {nickname || (user ? user.displayName?.split(' ')[0] : 'Familia')}</h1>
        {user ? (
          <img src={user.photoURL} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--theme-accent, transparent)' }} onClick={() => setIsSettingsOpen(true)} />
        ) : (
          <button className="md-btn md-btn-tonal" onClick={handleLogin}>Iniciar Sesión con Google</button>
        )}
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="md-card md-card-elevated" style={{ width: '90%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--theme-surface, white)' }}>
            <h2 style={{ margin: 0, color: 'var(--theme-text, black)' }}>Ajustes y Personalización</h2>
            
            <div>
              <label style={{ fontSize: '14px', color: 'var(--theme-text-variant, gray)' }}>Modo de Apariencia</label>
              <select value={themeMode} onChange={(e) => setThemeMode(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid gray', marginTop: '4px' }}>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '14px', color: 'var(--theme-text-variant, gray)' }}>Color de Acento</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: '50px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                <span style={{ fontFamily: 'monospace', color: 'var(--theme-text, black)' }}>{accentColor}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button className="md-btn" style={{ color: 'red' }} onClick={handleLogout}>Cerrar Sesión</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="md-btn" style={{ color: 'var(--theme-text, black)' }} onClick={() => setIsSettingsOpen(false)}>Cancelar</button>
                <button className="md-btn md-btn-primary" style={{ backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)' }} onClick={handleSaveTheme}>Aplicar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nickname Prompt */}
      {isPromptingNickname && (
        <div className="md-card md-card-elevated" style={{ backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>¿Cómo te decimos?</h2>
          <p style={{ margin: 0, fontSize: '14px' }}>Escribe tu apodo familiar (ej. Mamá, Tía, Tlal, Hannah).</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input 
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline)' }}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Tu apodo"
            />
            <button className="md-btn md-btn-primary" onClick={saveNickname}>Guardar</button>
          </div>
        </div>
      )}

      {/* Payment Alert */}
      {hasPendingDebts && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }} onClick={() => navigate('/debts')}>
          <div className="payment-alert-container">
            <div className="left-side">
              <div className="card">
                <div className="card-line"></div>
                <div className="buttons"></div>
              </div>
              <div className="post">
                <div className="post-line"></div>
                <div className="screen">
                  <div className="icon">!</div>
                </div>
                <div className="numbers"></div>
                <div className="numbers-line2"></div>
              </div>
            </div>
            <div className="right-side">
              <div className="new">Pago Pendiente ({pendingDebtCount})</div>
              <svg className="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 451.846 451.847">
                <path d="M345.441 248.292L151.154 442.573c-12.359 12.365-32.397 12.365-44.75 0-12.354-12.354-12.354-32.391 0-44.744L278.318 225.92 106.409 54.017c-12.354-12.359-12.354-32.394 0-44.748 12.354-12.359 32.391-12.359 44.75 0l194.287 194.284c6.177 6.18 9.262 14.271 9.262 22.366 0 8.099-3.091 16.196-9.267 22.373z"></path>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Card (Meeting UX) */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <style>{`
          .meeting-card {
            background-color: var(--theme-accent, #e9eeea);
            border-radius: 2rem;
            padding: 1.5rem;
            width: 100%;
            max-width: 380px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            margin: 0 auto;
            color: var(--theme-accent-text, #1a1a1a);
          }
          .meeting-card .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            position: relative;
          }
          .meeting-card .title {
            font-size: 1.875rem;
            font-weight: bold;
            line-height: 1.2;
            color: var(--theme-accent-text, #1a1a1a);
          }
          .meeting-card .date-selector {
            background-color: rgba(255,255,255,0.2);
            border-radius: 9999px;
            padding: 0.7rem 1.2rem;
            cursor: pointer;
            border: 1px solid rgba(255,255,255,0.4);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            transition: background-color 0.2s ease;
            color: var(--theme-accent-text, #1a1a1a);
          }
          .meeting-card .date-selector:hover {
            background-color: rgba(255,255,255,0.3);
          }
          .meeting-card .date-selector span {
            font-size: 1rem;
            font-weight: 500;
            margin-right: 0.5rem;
          }
          .meeting-card .calls-info {
            display: flex;
            align-items: center;
            margin-bottom: 2rem;
            color: var(--theme-accent-text, #1a1a1a);
          }
          .meeting-card .calls-info span {
            margin-left: 0.5rem;
            font-size: 0.875rem;
          }
          .meeting-card .date-nav-and-indicators {
            position: relative;
          }
          .meeting-card .date-nav-container {
            background-color: var(--theme-surface, white);
            border-radius: 16px;
            padding: 12px 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .meeting-card .day-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            width: 100%;
          }
          .meeting-card .day-number,
          .meeting-card .day-name {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 40px;
            background-color: transparent;
            transition: background-color 0.2s ease;
            color: var(--theme-text, #1a1a1a);
          }
          .meeting-card .day-number {
            font-size: 1.2rem;
            font-weight: 600;
            height: 28px;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            padding-top: 5px;
          }
          .meeting-card .day-name {
            font-size: 0.7rem;
            height: 20px;
            color: var(--theme-text-variant, #666);
            border-bottom-left-radius: 20px;
            border-bottom-right-radius: 20px;
          }
          .meeting-card .day-item:hover .day-number,
          .meeting-card .day-item:hover .day-name {
            background-color: var(--theme-surface-variant, #f8f8f8);
          }
          .meeting-card .day-active .day-number,
          .meeting-card .day-active .day-name {
            background-color: var(--theme-accent, #f0ff7a);
            color: var(--theme-accent-text, #000);
          }
          .meeting-card .indicator-container {
            display: flex;
            justify-content: space-between;
            width: 100%;
            position: relative;
            padding: 0 28px;
            box-sizing: border-box;
          }
          .meeting-card .indicator-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: rgba(255,255,255,0.4);
            position: relative;
            z-index: 2;
          }
          .meeting-card .indicator-active {
            background-color: var(--theme-accent-text, #000);
          }
          .meeting-card .indicator-line {
            position: absolute;
            top: 50%;
            left: 32px;
            right: 32px;
            height: 1px;
            border-top: 1.5px dashed rgba(255,255,255,0.4);
            z-index: 1;
          }
          .month-dropdown {
            position: absolute;
            top: 60px;
            right: 0;
            background: var(--theme-surface, white);
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 50;
            width: 150px;
            max-height: 200px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            color: var(--theme-text, black);
          }
          .month-dropdown div {
            padding: 10px 16px;
            cursor: pointer;
            border-bottom: 1px solid var(--theme-surface-variant, #f0f0f0);
          }
          .month-dropdown div:hover {
            background: var(--theme-surface-variant, #f9f9f9);
          }
        `}</style>
        <div className="meeting-card">
          <div className="header">
            <div className="title" style={{ fontFamily: 'var(--md-sys-typescale-display-large-font-family)' }}>Próximos<br />Eventos</div>
            <div className="date-selector" id="month-selector" onClick={() => setIsMonthMenuOpen(!isMonthMenuOpen)}>
              <span style={{ fontFamily: 'var(--md-sys-typescale-body-medium-font-family)' }}>{monthNames[selectedMonth]}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"></path>
              </svg>
            </div>
            
            {isMonthMenuOpen && (
              <div className="month-dropdown">
                {monthNames.map((m, i) => (
                  <div key={i} onClick={() => { setSelectedMonth(i); setIsMonthMenuOpen(false); }}>
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="calls-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"></path>
            </svg>
            <span style={{ fontFamily: 'var(--md-sys-typescale-body-medium-font-family)' }}>
              {events.length} {events.length === 1 ? 'evento' : 'eventos'} • {nextEvent ? nextEvent.title : 'Nada programado'}
            </span>
          </div>

          <div className="date-nav-and-indicators">
            <div className="date-nav-container" style={{ fontFamily: 'var(--md-sys-typescale-body-medium-font-family)' }}>
              {carouselDays.map((d, i) => (
                <div key={i} className={`day-item ${d.isToday ? 'day-active' : ''}`}>
                  <div className="day-number">{d.number}</div>
                  <div className="day-name">{d.name}</div>
                </div>
              ))}
            </div>

            <div className="indicator-container">
              <div className="indicator-line"></div>
              {carouselDays.map((d, i) => (
                <div key={i} className={`indicator-dot ${d.isToday ? 'indicator-active' : ''}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/schedule')}
        >
          <div style={{ background: 'var(--md-sys-color-secondary-container)', padding: '12px', borderRadius: '50%' }}>
            ⏰
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Horarios</span>
        </button>

        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/calendar')}
        >
          <div style={{ background: 'var(--md-sys-color-tertiary-container)', padding: '12px', borderRadius: '50%' }}>
            📅
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Calendario</span>
        </button>

        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px', gridColumn: '1 / -1' }}
          onClick={() => navigate('/groceries')}
        >
          <div style={{ background: 'var(--md-sys-color-primary-container)', padding: '12px', borderRadius: '50%' }}>
            🛒
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Lista del Súper</span>
        </button>

        {/* New sections */}
        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/calculator')}
        >
          <div style={{ background: 'var(--tag-yellow)', padding: '12px', borderRadius: '50%' }}>
            🧮
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Calculadora</span>
        </button>

        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/debts')}
        >
          <div style={{ background: 'var(--tag-green)', padding: '12px', borderRadius: '50%' }}>
            💸
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Cobrar</span>
        </button>
      </div>
    </div>
  );
}

export default Home;
