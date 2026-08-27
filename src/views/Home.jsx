import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { applyTheme } from '../App';
import { safeStorage } from '../services/storage';
import '../styles/payment-alert.css';
import '../styles/weather-card.css';

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState(safeStorage.get('familyNickname', ''));
  const [isPromptingNickname, setIsPromptingNickname] = useState(false);
  const [hasPendingDebts, setHasPendingDebts] = useState(false);
  const [pendingDebtCount, setPendingDebtCount] = useState(0);

  // Weather State
  const [weatherData, setWeatherData] = useState({
    temp: 22,
    location: 'Cargando clima...',
    humidity: 45,
    wind: 10,
    pressure: 1014,
    apparentTemp: 22,
    healthStatus: 'Bueno'
  });
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(safeStorage.get('familyTheme', 'dark'));
  const [accentColor, setAccentColor] = useState(safeStorage.get('familyAccent', '#006493'));
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Month selector & Events
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [userSchedule, setUserSchedule] = useState([]);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const shortMonthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Open-Meteo (API 100% gratuita y sin API key) para clima en tiempo real
  useEffect(() => {
    const fetchWeather = async (lat, lon, cityName) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m`);
        const data = await res.json();
        if (data && data.current) {
          setWeatherData({
            temp: Math.round(data.current.temperature_2m),
            location: cityName || 'Tu Ubicación',
            humidity: Math.round(data.current.relative_humidity_2m),
            wind: Math.round(data.current.wind_speed_10m),
            pressure: Math.round(data.current.surface_pressure),
            apparentTemp: Math.round(data.current.apparent_temperature),
            healthStatus: data.current.temperature_2m > 32 ? 'Caluroso' : (data.current.temperature_2m < 12 ? 'Fresco' : 'Saludable')
          });
        }
      } catch (err) {
        console.warn("No se pudo cargar el clima en tiempo real:", err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            // Reverse geocode gratis
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const geoData = await geoRes.json();
            const city = geoData.address?.city || geoData.address?.town || geoData.address?.county || geoData.address?.state || 'Local';
            fetchWeather(lat, lon, city);
          } catch {
            fetchWeather(lat, lon, 'Local');
          }
        },
        () => {
          // Fallback a CDMX / México
          fetchWeather(19.4326, -99.1332, 'México');
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeather(19.4326, -99.1332, 'México');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const localNickname = safeStorage.get('familyNickname', '');
        if (localNickname) {
          setNickname(localNickname);
          // Sync existing local nickname to Firestore in case it hasn't been uploaded yet
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists() || !userDoc.data().nickname) {
              await setDoc(userDocRef, {
                nickname: localNickname,
                displayName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || ''
              }, { merge: true });
            }
          } catch (e) {
            console.error("Error auto-syncing nickname to Firestore:", e);
          }
        } else {
          // If not in safeStorage, fetch from Firestore
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().nickname) {
              const firestoreNickname = userDoc.data().nickname;
              safeStorage.set('familyNickname', firestoreNickname);
              setNickname(firestoreNickname);
            } else {
              setIsPromptingNickname(true);
            }
          } catch (e) {
            console.error("Error fetching user nickname:", e);
            setIsPromptingNickname(true);
          }
        }
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
    if (!nickname) return;
    const nameLower = nickname.toLowerCase();
    if (nameLower === 'hannah' || nameLower === 'rodrigo') {
      const q = query(collection(db, 'schedules'), where('person', '==', nameLower));
      const unsub = onSnapshot(q, (snapshot) => {
        setUserSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    } else {
      setUserSchedule([]);
    }
  }, [nickname]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllEvents(fetchedEvents);
      const monthEvents = fetchedEvents.filter(e => {
        if (!e.dateMs) return false;
        const d = new Date(e.dateMs);
        return d.getMonth() === selectedMonth && d.getFullYear() === new Date().getFullYear();
      });
      setEvents(monthEvents.sort((a, b) => a.dateMs - b.dateMs));
    });
    return () => unsubEvents();
  }, [selectedMonth]);

  const handleCompleteEvent = async (eventId, e) => {
    if (e) e.stopPropagation();
    if (!eventId) return;
    try {
      await updateDoc(doc(db, 'events', eventId), {
        completed: true
      });
    } catch (err) {
      console.error("Error al completar el evento:", err);
    }
  };

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
      safeStorage.remove('familyNickname');
      setNickname('');
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const saveNickname = async () => {
    if (nickname.trim() && auth.currentUser) {
      const trimmed = nickname.trim();
      safeStorage.set('familyNickname', trimmed);
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          nickname: trimmed,
          displayName: auth.currentUser.displayName || '',
          photoURL: auth.currentUser.photoURL || ''
        });
      } catch (e) {
        console.error("Error saving nickname to Firestore:", e);
      }
      setIsPromptingNickname(false);
    }
  };

  const handleSaveTheme = () => {
    safeStorage.set('familyTheme', themeMode);
    safeStorage.set('familyAccent', accentColor);
    applyTheme(themeMode, accentColor);
    setIsSettingsOpen(false);
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to PWA install prompt: ${outcome}`);
      setDeferredPrompt(null);
    }
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

  const getNextClass = () => {
    if (userSchedule.length === 0) return null;
    
    const DAYS_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const currentDayString = DAYS_WEEK[currentDayIndex];
    const currentHourNum = today.getHours();
    
    const todaysClasses = userSchedule.filter(s => s.day === currentDayString);
    const futureClassesToday = todaysClasses.filter(s => {
      const startHour = parseInt((s.startTime || s.time).split(':')[0]);
      const endHour = s.endTime ? parseInt(s.endTime.split(':')[0]) : startHour + 1;
      return endHour > currentHourNum;
    }).sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));
    
    if (futureClassesToday.length > 0) {
      const startHour = parseInt((futureClassesToday[0].startTime || futureClassesToday[0].time).split(':')[0]);
      return { ...futureClassesToday[0], isNow: startHour <= currentHourNum };
    }
    
    // Look at future days
    for (let i = 1; i <= 7; i++) {
      const nextDayIdx = (currentDayIndex + i) % 7;
      const nextDayStr = DAYS_WEEK[nextDayIdx];
      const classesNextDay = userSchedule.filter(s => s.day === nextDayStr).sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));
      if (classesNextDay.length > 0) {
        return { ...classesNextDay[0], isNow: false, nextDayName: nextDayStr };
      }
    }
    return null;
  };

  const carouselDays = getDaysForCarousel();
  const nextEvent = events.length > 0 ? events[0] : null;

  // Eventos caducados (cuya fecha en milisegundos es anterior al inicio del día de hoy y no están completados)
  const startOfTodayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const expiredEvents = allEvents.filter(e => {
    if (!e.dateMs) return false;
    return e.dateMs < startOfTodayMs && !e.completed;
  }).sort((a, b) => b.dateMs - a.dateMs);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, backgroundColor: 'var(--theme-bg, var(--md-sys-color-background))', width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
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

            {deferredPrompt && (
              <div style={{ marginTop: '4px' }}>
                <button 
                  className="md-btn md-btn-primary" 
                  style={{ width: '100%', backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handleInstallApp}
                >
                  📥 Instalar Aplicación
                </button>
              </div>
            )}

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

      {/* Google Weather Card */}
      <div className={`weather-card-container ${isWeatherOpen ? 'is-expanded' : ''}`}>
        <div 
          className={`cardm ${isWeatherOpen ? 'is-open' : ''}`}
          onClick={() => setIsWeatherOpen(!isWeatherOpen)}
          title="Toca o pasa el cursor para ver detalles del clima"
        >
          <div className="card">
            <svg
              xmlSpace="preserve"
              viewBox="0 0 100 100"
              height="100px"
              width="100px"
              y="0px"
              x="0px"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              xmlns="http://www.w3.org/2000/svg"
              id="Layer_1"
              version="1.1"
              className="weather"
            >
              <image
                href="data:image/png;base64,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"
                y="0"
                x="0"
                height="100"
                width="100"
                id="image0"
              />
            </svg>
            <div className="main">{weatherData.temp} °C</div>
            <div className="mainsub">{weatherData.location}</div>
          </div>

          <div className="card2">
            <div className="upper">
              <div className="humidity">
                <svg
                  className="humiditysvg"
                  version="1.1"
                  id="Layer_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  x="0px"
                  y="0px"
                  width="24px"
                  height="24px"
                  viewBox="0 0 30 30"
                  xmlSpace="preserve"
                >
                  <image
                    id="image0"
                    width="30"
                    height="30"
                    x="0"
                    y="0"
                    href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAMAAAAM7l6QAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABiVBMVEUAAAAAAP9NerV/f39Oe7ZQfLZVf6pRfbfL5fdRfbZIbbZmmcxols5nl85OebSPsteLrdVSfLZxl89ok9FqlM5ahsBdicNahsFcicRhjcdWgbpahsFfi8ZbhsFijsmErOWLt+9xndZcicJahsFahsFdicN5n81xjcZqlNRpls1qlNBfn99pls9nkcxXgrpZgrtik81OebWNsdeMrtZOebRNerVZg7pwmMhNebRKdLRNerZNebHZ8v9olM9jj8rV7v3W7v1ch7+Ktu6Lt/CEsep7p+Cz1PO+3fqJte5/q+V+quOUvvLY8f+TvfKpzvapzfaqz/aRvPGdxfSVv/LX8P/W8P+32fnK5vyMuPCmzPXW8P6ny/WWv/KOufGawvO22PjJ5vzB4PrU7v6iyPSz1fiYwfKOufDD4funzPXF4vvE4vuOuvHV7/7U7/7G4/uNufCx1Pew0/ev0veu0feQu/G01viPufF/q+SCrud+quSItO2kyvWjyfVijslrltFmkcyEqtZgjMf///8NXQssAAAAPHRSTlMAAZgCW+EGy+jMBxRaRXHC2H8bX0ry/vrhyvnw0PDHR0Be/e/4/f4SDDNiEFVb0eI5iMHCho7NwI0YOBdy59CmAAAAAWJLR0SCi7P/RAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+cCEBITAJMBs+kAAAFbSURBVCjPY2CAAUYmZgY8gIWVBY8sGzsHJxc2CW4eXiDJx28jIAjiCgnzgoV5ebiBpIiomK2duISklL2Ng6O0jIwsmCsnIW5nKyYqwiDv5AwELq5uNjY27h6enh5grpcLiHKSZ1BwBgNvH6C0j68zKlCASfvZgIA/LukAsHQAVDgwCE06OAQoGxoMlQ4Lj0CVdo6MsomKhrJjfGwi0aSdY+NiYcx4G5sEdGkkkGhjk4RHOjnEJgWPtLNvKprL07CpgktHpEfgk/a3ycAnnWmThRDMxpDOscmFi6Xl5aNLF+QUwqWLbIoxogQBSpJskkpwS5cC4yYFp3RZElA6qQwh7VFeAWZXVFYByWpwxNcAueUeQGlFJWUZCZXauloVCRllVdt6NbB0QyOIq6TIoK4BSrWaWpogSltHVw8srW8A4mqoY6R6QyOgrLEJztxiamZuZsGGOztZWlnD2QBCYbJl9Cx9XAAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMi0xNlQxODoxOTowMCswMDowMG/wqfUAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDItMTZUMTg6MTk6MDArMDA6MDAerRFJAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAyLTE2VDE4OjE5OjAwKzAwOjAwSbgwlgAAAABJRU5ErkJggg=="
                  />
                </svg>
                <div className="humiditytext">Humedad<br />{weatherData.humidity}%</div>
              </div>

              <div className="air">
                <svg
                  xmlSpace="preserve"
                  viewBox="0 0 30 30"
                  height="24px"
                  width="24px"
                  y="0px"
                  x="0px"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  xmlns="http://www.w3.org/2000/svg"
                  id="Layer_1"
                  version="1.1"
                  className="airsvg"
                >
                  <image
                    href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAMAAAAM7l6QAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABaFBMVEUAAAAA//8ilfIhlfMglvIglfMglvIeku8cjf8glvMhlfIflvMhlfIhlvIglvMhl/MglvIglfIglPEfmfIhlfIglvQfn/8glfIglvIhlfMglfIglvMhl/AhlfIcm/AAf/8qlOkglPYglvIZmf8zmf8hlfIglfIXi+cilPMhlvMglfQhlvMglvIhlfIgl/MglvMhlvMhlfMhlvIfl+8hlvMhlfMglvMglvI/f/8hlvMilvMelvAglfIglvMhlvIglPIglvIhlfIkkfUglfMglfMhlvMhlvMilvMjlfEglvMhlfIhlfMglfIflvEnnOshlvIflPEflfIek/QglvIglvMhlfIime4jlPAglvMglvEhlvMhl/MglfMglfMhlvIak/Edk/UhlvIglfMgl/IglvIglfIilPIhlvMhlfMhk/Eqqv8glvIglfMcl/UhlfMhlvIhlvMhlfIglfIhlfIgl/QflPQhlvP///+FIn/GAAAAdnRSTlMAAVKu1MmNIQmy91ig/Z5s0fo3KP5dCL27Lvm0NvwSAgwf+woFv7oLQ0RGa9L1Vtndx4sgme3FZgTIFiI/hvZld3sch8Tv7kI683nV6DgN4GBQMsycjw8k6nWqRW3cUxMa5dpnfLU87N8mBrxXG5jnibjLoi8YaHuXCQAAAAFiS0dEd0Zk+dcAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAhEIBBbLW8PtAAABJ0lEQVQoz62RZ1fCMBSG46atomBR1IJ7g+KotKKgxYl74Z6493x/v6T0QKMtn/p8ec/Nk5Pc5BLiHCWlZeUVlVU21sWBwgvWuho1bqG2Dh6vla0X4ctGQyP8VrqpuUVPCQGXlQ+26tEGtBfpX0JHp73t6kYPs9Db159nYDAEj8RoNxjCQ+xxvuFIgZHRMcemQMi4iP+I8kRU0TUHG9RJqpWYFVPTcahKsc/jkSAzfgNuVvvjk5gj84W7FhZZvYRl4o0apFawGmT0GsKmankDmzS31O3cQgo75t27SNLYQyRNc/8AhzkROzrOPjCEE1poMk7Pzi8Sl7gyxp5B/Fq4Aa//A7m9y7V6/2Ac+/hEy8CzUb68ysDbezp/rZL5+Pz6NvWh/TgwzV+1HV523WQ81AAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMi0xN1QwODowNDoyMiswMDowML1dmzYAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDItMTdUMDg6MDQ6MjIrMDA6MDDMACOKAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAyLTE3VDA4OjA0OjIyKzAwOjAwmxUCVQAAAABJRU5ErkJggg=="
                    y="0"
                    x="0"
                    height="30"
                    width="30"
                    id="image0"
                  />
                </svg>
                <div className="airtext">Viento<br />{weatherData.wind} Km/h</div>
              </div>
            </div>

            <div className="lower">
              <div className="aqi">
                <svg
                  xmlSpace="preserve"
                  viewBox="0 0 20 20"
                  height="18px"
                  width="18px"
                  y="0px"
                  x="0px"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  xmlns="http://www.w3.org/2000/svg"
                  id="Layer_1"
                  version="1.1"
                  className="aqisvg"
                >
                  <image
                    href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABBVBMVEUAAABL4f9O5v9P5f9Q5f9R5/8AZsxB0vYAd9EAeNQAd9MeoOM1w/EYmuIZm+IXnOIAAP8AccYmrOgYmuAWneEA//8AdtQZm+JP5f8ZmeUAf89L3vwcoOQYmeIAddEAeNUrseocjeIAd9QAeNMxu+4kqucZmuEYm+IWmeI5xfIfn99P3/9Q5v9Q5v9Q5v9G2Pk0wPA+zfZN4v5L3/w+zfUyve8iqOcrs+s9zPVM4f1N4v1E1vklrOkip+cmrOhH2fpP5f5F1/kstewqs+tO4/4nruott+0or+pL3vxE1flK3vxA0fcjqecrtOxO5P4yvvAstOw6yPNA0Pc7yfQ4xfI3xPL////cI4U2AAAALnRSTlMAEXF3ZWsFeC3S26iVh7MsAQnAVCIBZ7FtChBv6GonVZQJs4yLxtPNLY8IEHuINVg0ZAAAAAFiS0dEVgoN6YkAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAhIFCRn0J5yMAAAAq0lEQVQY02NgIAkwMjFDARMjXJBFDw5Y4IKsCEFWmBgbux6+gaERsiAHJxe3nrGJqZm5haWeFQ8vHz9QUEAQqt3a1MbWTkhYRBRmprG9A5qZYuJ6jk62ziYuQEEJSaiglDRIjaOpraubu4wsupM8PL2g2gXk5BX0vH18LYwgZiqCLOJQUlbR0/Nz9LcNCAwKVlVT10DRbh1iGqqphc+b2ANEW0cXCnS0SQt0ALCcIug70CWhAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTAyLTE4VDA1OjA5OjI1KzAwOjAwRMIpTAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0wMi0xOFQwNTowOToyNSswMDowMDWfkfAAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjMtMDItMThUMDU6MDk6MjUrMDA6MDBiirAvAAAAAElFTkSuQmCC"
                    y="0"
                    x="0"
                    height="20"
                    width="20"
                    id="image0"
                  />
                </svg>
                <div className="aqitext">ICA<br />Bueno</div>
              </div>

              <div className="realfeel">
                <svg
                  xmlSpace="preserve"
                  viewBox="0 0 20 20"
                  height="18px"
                  width="18px"
                  y="0px"
                  x="0px"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  xmlns="http://www.w3.org/2000/svg"
                  id="Layer_1"
                  version="1.1"
                  className="rfsvg"
                >
                  <image
                    href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABuVBMVEUAAAAAAAAECQkIDg4EBAQAAAAAAAAFBQUHDAwIDg4MFBUNFRUKCgoPGhxGenw/b3FDdXcmRUYJDAwJDw9Pi40LFBQNFhYMFhYPGhsMExUKEhIPGhoKEhQMExMOGhoMExMPGhoKFBQLExMNFxcKEhILFBQKExMKExQLEhILERMKEREHDQ1SkJMuUlMABAQAAAASHh9FeXtAcXI8aWszWlwvU1M4Y2QjPT4NGBoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYmZtWlplKgoVlsbRsvsF0zM9uwsVuwcNsvb9ecU53czF0bStgbkdqt7dntbhntbVxaCf5uxD+vxD7vBBTUilYlZdtwMNms7Zdc1P8vRDYpBR5b0imsKy0wcFzhoZdkpRldEx6cU3W5eWLnJxdm51otrlZdl67kBWxvbmUo6RmfHxajo9ouLpqt7mJdiN8YxnH1dWVpaVfn6Jgl41OUUKvu7pWe3xwxsldn6KmtLTO3NxUf4BswMN0ys1gpaedrKzT4uJjd3dsvcBqubxXg4Vgd3hthYVid3dhdnZof39shYVkf4BVeXpqt7pksbJjr7Jdo6X////f0mPcAAAAQXRSTlMABGh/a1xUZIqPo7BH2vv4/vJQgvyxwLLCpqXBsafBqcKutcCwuamtop+SgPzwOQzg/f728fD166Zla1o/PiEmFs+XjUIAAAABYktHRJKWBO8gAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5wISBQ8aO3RqsAAAAQlJREFUGNNjYMAOGJmYmVlY2djYmZk5OLm4ecBivHyOTs7O/ALOTo6Oji6ugkJAQWERNxTgLgoUFEMVc/MQBwpKuLl5enn7+PpBBf0lwYIBgUHBwSGhYeFgwQgpoKC0W2RUcHB0TGxcfAJYuwxYMDE4OCgpGQhSUoGCabJAQTm39KDgjEyQYHJWdo5brjxQUMEtLz+ooDAZAoqKXRXBgm4lpWXJMFBeoQQUVHZzq6yCi1XX1KoABVXr3OobYGKNTc0takBBdVc3t9a29vaOzq7unt4+t34NoKDmBFRvTtQCCmrroArq6gEF9Q0MnY2MTUxNzYxBwNwCHMj6llbWNrZ29jZg4IAjKhgAAWdbVO4nzP4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDItMThUMDU6MTU6MjYrMDA6MDCumAyfAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAyLTE4VDA1OjE1OjI2KzAwOjAw38W0IwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyMy0wMi0xOFQwNToxNToyNiswMDowMIjQlfwAAAAASUVORK5CYII="
                    y="0"
                    x="0"
                    height="20"
                    width="20"
                    id="image0"
                  />
                </svg>
                <div className="realfeeltext">Sensación<br />{weatherData.apparentTemp} °C</div>
              </div>

              <div className="pressure">
                <svg
                  xmlSpace="preserve"
                  viewBox="0 0 20 20"
                  height="18px"
                  width="18px"
                  y="0px"
                  x="0px"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  xmlns="http://www.w3.org/2000/svg"
                  id="Layer_1"
                  version="1.1"
                  className="pressuresvg"
                >
                  <image
                    href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABNVBMVEUAAAAAr8EArMAAqsAArMEBrMEBrMAAq8AArb8AqsIBrMEgtMa53+S53+QetMYArMEArMEAqrsArMA9scFegp4Cqr8Ao8gArMEErMHn6+wTobgArMAArMBCvc1sco8Aq8EArMFSqrmNWn1Dvs4Aq8EErcLo7O0SorgArMAAq8A8sMBie5gCqr8BrMEftMa23eO33uQcs8YAq8AArMAAq8ABq8AAq8EAq8Mtdn9DW2OvvcSwvcSrucJ3kZyvvcWvv8OruMJ6kZ55kJ2rusAArMHFzdLH0NS5xMru7u7l5+jm6Ojp3eDd4OK2ubvAhZL4G0enrK1YYWV3foHu7e39Mlns7OwzXWQxW2Tl5+f6VHSssLKpra/9MVnc4OL1m6y5xcvv09kxcX5FWmR4kJywvsWsusL///80ikJBAAAARHRSTlMAHUotv/j5vSw/9cvd3MrzPg/q4+rqDnXk+/NzucP3t873/cJ05Przcunj8en0y93cyz28/vu7K1RASpWb/YBAhvP3hpKCbb4AAAABYktHRGYs1NklAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5wISBRAIBZcVZgAAAM1JREFUGNNjYMAHGJmYGNGEmFlcWNlc2DmQxTi5uHlc3Xj5+AUQYoJCwu4enl4e3iKiYnBBcQlJHw8PD18/fylpuKCMLFAoIDAoOEROHi6ooOjuERoWHuERqaSAUKkMVBkV7REcg6RSRVUtFijsEeevroGwXVMrHiSYoK2DsJ1BQFdP38PDwJDfCNn1HMYmpqYmZuZoHrVITLTACBDLpCRLJK6VNRDY2CYn29qAWFZgQbsUIEhNBoJUEMsOLGhvBwQOjk5Ojs4glj0DCQAAJCUofMKIT9cAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDItMThUMDU6MTY6MDgrMDA6MDBXtcu8AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAyLTE4VDA1OjE2OjA4KzAwOjAwJuhzAAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyMy0wMi0xOFQwNToxNjowOCswMDowMHH9Ut8AAAAASUVORK5CYII="
                    y="0"
                    x="0"
                    height="20"
                    width="20"
                    id="image0"
                  />
                </svg>
                <div className="pressuretext">Presión<br />{weatherData.pressure} hPa</div>
              </div>
              <div className="card3">{weatherData.healthStatus}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Card (Meeting UX) */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <style>{`
          .meeting-card {
            background-color: var(--theme-accent, #e9eeea);
            border-radius: 2rem;
            padding: 1.5rem;
            width: 100%;
            max-width: 800px;
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

          {(() => {
            const nextClass = getNextClass();
            const isHannahOrRodrigo = nickname && (nickname.toLowerCase() === 'hannah' || nickname.toLowerCase() === 'rodrigo');
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
                <div 
                  className="calls-info" 
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: 0 }}
                  onClick={() => navigate('/calendar')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"></path>
                  </svg>
                  <span style={{ fontFamily: 'var(--md-sys-typescale-body-medium-font-family)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                    {events.length} {events.length === 1 ? 'evento' : 'eventos'} • {nextEvent ? nextEvent.title : 'Nada programado'}
                  </span>
                </div>

                {isHannahOrRodrigo && nextClass && (
                  <div 
                    className="calls-info" 
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: 0 }}
                    onClick={() => navigate(`/schedule/${nickname.toLowerCase()}`)}
                  >
                    <span style={{ fontSize: '20px' }}>⏰</span>
                    <span style={{ fontFamily: 'var(--md-sys-typescale-body-medium-font-family)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                      {nextClass.isNow ? '🔴 En curso' : '📅 Siguiente clase'}: {nextClass.subject} ({nextClass.startTime || nextClass.time}h) {nextClass.room ? `en ${nextClass.room}` : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

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

      {/* Alerta de Eventos Caducados */}
      {expiredEvents.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div 
            className="md-card md-card-elevated" 
            style={{ 
              width: '100%', 
              maxWidth: '800px', 
              borderRadius: '24px', 
              padding: '20px', 
              backgroundColor: 'var(--md-sys-color-error-container, #ffdad6)', 
              color: 'var(--md-sys-color-on-error-container, #410002)', 
              border: '1px solid rgba(186, 26, 26, 0.2)',
              boxShadow: '0 8px 20px rgba(186, 26, 26, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px', animation: 'pulse-alert 2s infinite', display: 'inline-block' }}>⚠️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Eventos Caducados</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.85 }}>
                    Ya pasaron su fecha y están pendientes. ¡Táchalos cuando estén listos!
                  </p>
                </div>
              </div>
              <span style={{ 
                backgroundColor: 'var(--md-sys-color-error, #ba1a1a)', 
                color: 'white', 
                padding: '4px 10px', 
                borderRadius: '9999px', 
                fontSize: '12px', 
                fontWeight: 'bold' 
              }}>
                {expiredEvents.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {expiredEvents.map((ev) => {
                const evDate = new Date(ev.dateMs);
                const dateString = `${evDate.getDate()} de ${shortMonthNames[evDate.getMonth()]}`;
                return (
                  <div 
                    key={ev.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--theme-surface, #ffffff)', 
                      color: 'var(--theme-text, #1a1a1a)',
                      padding: '12px 16px', 
                      borderRadius: '16px', 
                      gap: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {ev.title}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--theme-text-variant, #666)' }}>
                        📅 Venció el {dateString} {ev.assignedTo ? `• 👤 ${ev.assignedTo}` : ''}
                      </span>
                    </div>

                    <button 
                      className="md-btn"
                      onClick={(e) => handleCompleteEvent(ev.id, e)}
                      title="Marcar como hecho y quitar de la lista"
                      style={{ 
                        backgroundColor: 'var(--md-sys-color-primary, #006493)', 
                        color: 'white', 
                        borderRadius: '12px', 
                        padding: '8px 14px', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        border: 'none',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <span>✓</span> Tachar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Menu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '16px', width: '100%' }}>
        {/* 1. Horarios */}
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

        {/* 2. Calendario */}
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

        {/* 3. Encontrar (Find My) */}
        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/find')}
        >
          <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '50%' }}>
            📍
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Encontrar</span>
        </button>

        {/* 4. Lista del Súper */}
        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/groceries')}
        >
          <div style={{ background: 'var(--md-sys-color-primary-container)', padding: '12px', borderRadius: '50%' }}>
            🛒
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Lista del Súper</span>
        </button>

        {/* 5. To Do */}
        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/todo')}
        >
          <div style={{ background: 'var(--tag-purple, #f0dbff)', padding: '12px', borderRadius: '50%' }}>
            📝
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>To Do</span>
        </button>

        {/* 5. Cobrar */}
        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/debts')}
        >
          <div style={{ background: 'var(--tag-green, #74f8b6)', padding: '12px', borderRadius: '50%' }}>
            💸
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Cobrar</span>
        </button>

        {/* 6. Calculadora */}
        <button 
          className="md-card md-card-elevated" 
          style={{ border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', height: '120px' }}
          onClick={() => navigate('/calculator')}
        >
          <div style={{ background: 'var(--tag-yellow, #e4e37f)', padding: '12px', borderRadius: '50%' }}>
            🧮
          </div>
          <span style={{ fontSize: '18px', fontWeight: '500', color: 'var(--md-sys-color-on-surface)' }}>Calculadora</span>
        </button>
      </div>
    </div>
  );
}

export default Home;
