import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { applyTheme } from '../App';
import { safeStorage } from '../services/storage';
import StrokeText from '../components/StrokeText';
import SplitText from '../components/SplitText';
import BlurText from '../components/BlurText';
import '../styles/payment-alert.css';
import '../styles/weather-card.css';
import '../styles/easter-egg.css';
import '../styles/theme-switch.css';
import '../styles/color-palette.css';
import '../styles/profile-egg.css';

function FamilyEasterEgg() {
  const [isActive, setIsActive] = useState(false);

  const playPowerUpSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const now = context.currentTime;
      // Sonido retro estilo power-up de Mario
      [330, 392, 659, 523, 587, 784].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.14, now + index * 0.07 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.12);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.07);
        oscillator.stop(now + index * 0.07 + 0.14);
      });
      window.setTimeout(() => context.close(), 700);
    } catch {
      // Audio enhancement
    }
  };

  const triggerEgg = () => {
    setIsActive(true);
    playPowerUpSound();
    window.setTimeout(() => setIsActive(false), 900);
  };

  return (
    <div className="mario-easter-egg-section">
      <div className="mario-stage-row">
        <div className="brick one"></div>
        <div className={`tooltip-mario-container ${isActive ? 'is-active' : ''}`} onClick={triggerEgg}>
          <div className="box" title="¡Golpea el bloque!"></div>
          <div className="mush">
            <svg
              className="icon"
              viewBox="0 0 1024 1024"
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
            >
              <path
                d="M288.582 111.71h55.854v55.854h-55.854v-55.855zm-111.71 484.072h167.564v55.854H176.873v-55.854zM623.71 502.69h111.71v55.854h-111.71v-55.854zm55.855 55.854h111.709V614.4h-111.71v-55.855zm0 55.855h167.563v37.236H679.564V614.4z"
                fill="#B8332B"
              ></path>
              <path
                d="M176.873 651.636h167.563v74.473H176.873v-74.473zm0 74.473h111.709v74.473h-111.71v-74.473zm558.545 0h111.71v74.473h-111.71v-74.473zm-55.854-74.473h167.563v74.473H679.564v-74.473zm-316.51-93.09h55.855V614.4h-55.854v-55.855zm204.8 0h55.855V614.4h-55.854v-55.855z"
                fill="#FFF1E3"
              ></path>
              <path
                d="M791.273 595.782h55.854V614.4h-55.854v-18.618zm-55.855-55.855h37.237v18.618h-37.237v-18.618zm-316.509-93.09h204.8v111.708h-204.8V446.836zM232.727 558.544h111.71v37.237h-111.71v-37.237zm111.71-111.709h18.618v37.237h-18.619v-37.237zM307.2 484.073h55.855v18.618H307.2v-18.618zm-18.618 18.618h74.473v37.236h-74.473v-37.236zm-37.237 37.236h111.71v18.618h-111.71v-18.618zM623.71 111.71h18.618v55.855H623.71v-55.855zm18.618 37.236h148.946v18.619H642.327v-18.619zm-297.89-55.854h279.272v74.473H344.436V93.09z"
                fill="#B8332B"
              ></path>
              <path
                d="M344.436 55.855H623.71V93.09H344.436V55.855zm297.891 55.854h148.946v37.236H642.327V111.71zM288.582 446.836h55.854v37.237h-55.854v-37.237zm446.836 55.855h55.855v37.236h-55.855v-37.236zm55.855 55.854h55.854v37.237h-55.854v-37.237zm-502.691-74.472H307.2v18.618h-18.618v-18.618zm484.073 55.854h18.618v18.618h-18.618v-18.618zm-539.928 0h18.618v18.618h-18.618v-18.618zm0-37.236h55.855v37.236h-55.855v-37.236zm-55.854 55.854h55.854v37.237h-55.854v-37.237z"
                fill="#FF655B"
              ></path>
              <path
                d="M288.582 167.564h55.854v55.854h-55.854v-55.854zm0 167.563h55.854v55.855h-55.854v-55.855z"
                fill="#432E23"
              ></path>
              <path
                d="M269.964 856.436h148.945v55.855H269.964v-55.855zm0 55.855h148.945v55.854H269.964v-55.854z"
                fill="#9F5A31"
              ></path>
              <path
                d="M176.873 912.29h93.09v37.237h-93.09v-37.236zm577.163 0h93.091v37.237h-93.09v-37.236z"
                fill="#F38C50"
              ></path>
              <path
                d="M176.873 949.527h93.09v18.618h-93.09v-18.618zm577.163 0h93.091v18.618h-93.09v-18.618zm-148.945-93.09h148.945v55.854H605.091v-55.855zm0 55.854h148.945v55.854H605.091v-55.854z"
                fill="#9F5A31"
              ></path>
              <path
                d="M363.055 446.836h55.854v111.71h-55.854v-111.71zm0 167.564h316.509v37.236h-316.51V614.4zm-18.619 37.236h335.128v74.473H344.436v-74.473zm-55.854 74.473h446.836v74.473H288.582v-74.473zm130.327-130.327h148.946V614.4H418.909v-18.618zm-130.327 204.8h167.563v55.854H288.582v-55.854zm279.273 0h167.563v55.854H567.855v-55.854zm55.854-242.037h55.855V614.4h-55.855v-55.855z"
                fill="#2E67B1"
              ></path>
              <path
                d="M418.91 558.545h148.945v37.237H418.909v-37.237z"
                fill="#66A8FF"
              ></path>
              <path
                d="M344.436 558.545h18.619v93.091h-18.619v-93.09z"
                fill="#2E67B1"
              ></path>
              <path
                d="M400.29 279.273h55.855v55.854h-55.854v-55.854zm0-111.71h55.855v55.855h-55.854v-55.854zm-55.854 0h55.855v167.564h-55.855V167.564zm279.273 111.71h55.855v55.854h-55.855v-55.854zm-55.854-55.855h55.854v55.855h-55.854v-55.855zm0 111.71h223.418v55.854H567.855v-55.855z"
                fill="#432E23"
              ></path>
              <path
                d="M288.582 223.418h55.854v111.71h-55.854v-111.71zm167.563-55.854h223.419v55.854H456.145v-55.854zm-55.854 55.854h167.564v55.855H400.29v-55.855zm55.854 55.855H623.71v55.854H456.145v-55.854zm-111.709 55.854h223.419v55.855H344.436v-55.855zm0 55.855h390.982v55.854H344.436v-55.854zM623.71 223.418h167.564v55.855H623.709v-55.855zm55.855 55.855h167.563v55.854H679.564v-55.854z"
                fill="#FFF1E3"
              ></path>
              <path
                d="M232.727 223.418h55.855v167.564h-55.855V223.418z"
                fill="#432E23"
              ></path>
              <path
                d="M232.727 111.71h55.855v111.708h-55.855V111.71zm-55.854 111.708h55.854v167.564h-55.854V223.418zm55.854 167.564h111.71v55.854h-111.71v-55.854zm-55.854 409.6h111.709v55.854h-111.71v-55.854zm279.272 0h111.71v55.854h-111.71v-55.854zm-279.272 55.854h93.09v55.855h-93.09v-55.855zm-55.855 55.855h55.855V1024h-55.855V912.29zm726.11 0h55.854V1024h-55.855V912.29zm-670.255 55.854H400.29V1024H176.873v-55.855zm446.836 0h223.418V1024H623.71v-55.855zm111.71-167.563h111.708v55.854H735.418v-55.854zm18.617 55.854h93.091v55.855h-93.09v-55.855zM288.582 55.855h55.854v55.854h-55.854V55.855zm-55.855 390.981h55.855v55.855h-55.855v-55.855zm-55.854 55.855h55.854v55.854h-55.854v-55.854zm614.4 0h55.854v55.854h-55.854v-55.854zm-670.255 55.854h55.855v242.037h-55.855V558.545zM418.91 856.436h55.855v111.71h-55.855v-111.71zm130.327 0h55.855v111.71h-55.855v-111.71zm297.891-297.89h55.855v242.036h-55.855V558.545zm-55.854-446.837h55.854v55.855h-55.854v-55.855zm0 111.71h55.854v55.854h-55.854v-55.855zm55.854 55.854h55.855v55.854h-55.855v-55.854zm-55.854 55.854h55.854v55.855h-55.854v-55.855zm-55.855 55.855h55.855v55.854h-55.855v-55.854zM623.71 446.836h167.564v55.855H623.709v-55.855zm0-390.981h167.564v55.854H623.709V55.855zm55.855 111.709h111.709v55.854h-111.71v-55.854zM344.436 0H623.71v55.855H344.436V0z"
                fill="#10001D"
              ></path>
            </svg>
          </div>
        </div>
        <div className="brick two"></div>
      </div>
      <BlurText 
        text="🍄 Toca el bloque de interrogación"
        delay={80}
        animateBy="words"
        direction="top"
        style={{ fontSize: '13px', color: 'var(--theme-text-variant, #888)', marginTop: '8px' }}
      />
    </div>
  );
}

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
      {/* Header with StrokeText */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <StrokeText 
            text={`Hola, ${nickname || (user ? user.displayName?.split(' ')[0] : 'Familia')}`}
            strokeColor="var(--theme-accent, #A78BFA)"
            fillColor="var(--theme-text, #ffffff)"
            strokeWidth={1.4}
            drawDuration={1.4}
            fillDelay={0.2}
            fontSize={28}
            fontWeight={800}
          />
        </div>
        {user ? (
          <img src={user.photoURL} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--theme-accent, transparent)' }} onClick={() => setIsSettingsOpen(true)} />
        ) : (
          <button className="md-btn md-btn-tonal" onClick={handleLogin}>Iniciar Sesión con Google</button>
        )}
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div className="md-card md-card-elevated" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--theme-surface, white)', padding: '24px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: 0, color: 'var(--theme-text, black)', fontSize: '22px', fontWeight: 'bold' }}>Ajustes y Personalización</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: 'var(--theme-text-variant, gray)', fontWeight: '600' }}>Modo de Apariencia ({themeMode === 'dark' ? 'Oscuro' : 'Claro'})</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
                <label className="theme-switch" aria-label="Cambiar modo de apariencia entre Claro y Oscuro">
                  <input 
                    type="checkbox" 
                    className="theme-switch__checkbox" 
                    checked={themeMode === 'dark'}
                    onChange={(e) => {
                      const nextMode = e.target.checked ? 'dark' : 'light';
                      setThemeMode(nextMode);
                      applyTheme(nextMode, accentColor);
                    }}
                  />
                  <div className="theme-switch__container">
                    <div className="theme-switch__clouds"></div>
                    <div className="theme-switch__stars-container">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" fill="currentColor"></path>
                      </svg>
                    </div>
                    <div className="theme-switch__circle-container">
                      <div className="theme-switch__sun-moon-container">
                        <div className="theme-switch__moon">
                          <div className="theme-switch__spot"></div>
                          <div className="theme-switch__spot"></div>
                          <div className="theme-switch__spot"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: 'var(--theme-text-variant, gray)', fontWeight: '600' }}>
                Color de Acento de la App
              </label>

              {/* Uiverse.io by arshshaikh06 - Palette */}
              <div className="palette-container">
                <div className="palette">
                  {[
                    { name: 'Naranja', hex: '#F4A261' },
                    { name: 'Azul', hex: '#006493' },
                    { name: 'Rosa', hex: '#E76F51' },
                    { name: 'Morado', hex: '#8B5CF6' }
                  ].map((col) => {
                    const isActive = accentColor.toUpperCase() === col.hex.toUpperCase();
                    return (
                      <div 
                        key={col.hex}
                        className={`palette-color ${isActive ? 'is-active' : ''}`}
                        style={{ backgroundColor: col.hex }}
                        onClick={() => {
                          setAccentColor(col.hex);
                          applyTheme(themeMode, col.hex);
                        }}
                      >
                        <span>{col.name}</span>
                      </div>
                    );
                  })}
                  {/* Botón + Personalizado */}
                  <label 
                    className={`palette-color ${!['#F4A261', '#006493', '#E76F51', '#8B5CF6'].includes(accentColor.toUpperCase()) ? 'is-active' : ''}`}
                    style={{ 
                      backgroundColor: !['#F4A261', '#006493', '#E76F51', '#8B5CF6'].includes(accentColor.toUpperCase()) ? accentColor : '#2A2D34',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      cursor: 'pointer'
                    }}
                    title="Color personalizado"
                  >
                    <input 
                      type="color" 
                      value={accentColor} 
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        applyTheme(themeMode, e.target.value);
                      }} 
                      style={{ opacity: 0, position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
                    />
                    <span style={{ opacity: 1, fontSize: '16px', lineHeight: 1 }}>+</span>
                    <span style={{ fontSize: '9px' }}>Custom</span>
                  </label>
                </div>
                <div className="palette-stats">
                  <span>Color activo: <strong style={{ color: 'var(--theme-text, black)', fontFamily: 'monospace' }}>{accentColor}</strong></span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 18">
                    <path d="M4 7.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5S5.5 9.83 5.5 9 4.83 7.5 4 7.5zm10 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-5 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5S9.83 7.5 9 7.5z"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Easter Egg de Pascua Animado Uiverse forzayt con sonido */}
            <div 
              className="profile-easter-wrapper"
              onClick={() => {
                try {
                  const AudioContext = window.AudioContext || window.webkitAudioContext;
                  if (AudioContext) {
                    const ctx = new AudioContext();
                    const now = ctx.currentTime;
                    // Sonido juguetón estilo 'Boing / Jump' de caricatura
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(280, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);
                    gain.gain.setValueAtTime(0.35, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.3);
                  }
                } catch (e) {}
              }}
              title="¡Tócame!"
            >
              <div className="easter-animation">
                <div className="egg">
                  <div className="eyes"></div>
                </div>
                <div className="easter-shadow"></div>
                <div className="easter-clouds">
                  <div className="cloud1"></div>
                  <div className="cloud2"></div>
                  <div className="cloud3"></div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--theme-text-variant, #888)', marginTop: '-8px' }}>
                🥚 ¡Toca el huevito saltarín!
              </span>
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

      {/* Weather card inspired by the supplied Uiverse stacked-card reference */}
      <div className="weather-card-container">
        <div 
          className={`weather-uiverse ${isWeatherOpen ? 'is-expanded' : ''}`}
          onClick={() => setIsWeatherOpen(!isWeatherOpen)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsWeatherOpen(!isWeatherOpen);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isWeatherOpen}
          title="Toca para ver u ocultar detalles meteorológicos"
        >
          <div className="weather-card-front">
            <div className="weather-animated-sun" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="weather-sun-core" cx="32" cy="32" r="16" fill="url(#sun-grad)" />
                <g className="weather-sun-rays" stroke="#ff9800" strokeWidth="3.5" strokeLinecap="round">
                  <line x1="32" y1="6" x2="32" y2="10" />
                  <line x1="32" y1="54" x2="32" y2="58" />
                  <line x1="6" y1="32" x2="10" y2="32" />
                  <line x1="54" y1="32" x2="58" y2="32" />
                  <line x1="13.6" y1="13.6" x2="16.5" y2="16.5" />
                  <line x1="47.5" y1="47.5" x2="50.4" y2="50.4" />
                  <line x1="13.6" y1="50.4" x2="16.5" y2="47.5" />
                  <line x1="47.5" y1="16.5" x2="50.4" y2="13.6" />
                </g>
                <defs>
                  <linearGradient id="sun-grad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffb300" />
                    <stop offset="1" stopColor="#ff5722" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="weather-summary">
              <div className="weather-temp-number">{weatherData.temp} °C</div>
              <div className="weather-location-text">{weatherData.location}</div>
            </div>
            <div className="weather-expand-indicator" aria-hidden="true">
              {isWeatherOpen ? '−' : '+'}
            </div>
          </div>

          <div className="weather-card-details">
            <div className="weather-primary-stats">
              <div className="weather-stat-item">
                <span className="weather-stat-icon" aria-hidden="true">💧</span>
                <span><strong>{weatherData.humidity}%</strong>Humedad</span>
              </div>
              <div className="weather-stat-item">
                <span className="weather-stat-icon" aria-hidden="true">〰</span>
                <span><strong>{weatherData.wind} km/h</strong>Viento</span>
              </div>
            </div>
            <div className="weather-secondary-stats">
              <div className="weather-stat-item">
                <span><strong>{weatherData.apparentTemp} °C</strong>Sensación</span>
              </div>
              <div className="weather-stat-item">
                <span><strong>{weatherData.pressure} hPa</strong>Presión</span>
              </div>
            </div>
            <div className="weather-health-strip">{weatherData.healthStatus}</div>
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
            <div className="title" style={{ fontFamily: 'var(--md-sys-typescale-display-large-font-family)' }}>
              <SplitText 
                text="Próximos Eventos"
                delay={40}
                duration={0.6}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 25 }}
                to={{ opacity: 1, y: 0 }}
                style={{ fontWeight: 'bold' }}
              />
            </div>
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

      <FamilyEasterEgg />
    </div>
  );
}

export default Home;
