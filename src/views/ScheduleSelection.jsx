import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ghost.css';

function ScheduleSelection() {
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--md-sys-color-background)' }}>
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--md-sys-color-surface)', boxShadow: 'var(--md-sys-elevation-1)' }}>
        <button className="md-btn md-btn-tonal" style={{ padding: '0 12px' }} onClick={() => navigate('/')}>←</button>
        <h1 style={{ margin: 0, fontSize: '22px' }}>Horarios UVM</h1>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px', padding: '24px' }}>
        
        {/* Ghost Animation */}
        <div id="ghost">
          <div id="red">
            <div id="pupil"></div>
            <div id="pupil1"></div>
            <div id="eye"></div>
            <div id="eye1"></div>
            <div id="top0"></div>
            <div id="top1"></div>
            <div id="top2"></div>
            <div id="top3"></div>
            <div id="top4"></div>
            <div id="st0"></div>
            <div id="st1"></div>
            <div id="st2"></div>
            <div id="st3"></div>
            <div id="st4"></div>
            <div id="st5"></div>
            <div id="an1"></div>
            <div id="an2"></div>
            <div id="an3"></div>
            <div id="an4"></div>
            <div id="an5"></div>
            <div id="an6"></div>
            <div id="an7"></div>
            <div id="an8"></div>
            <div id="an9"></div>
            <div id="an10"></div>
            <div id="an11"></div>
            <div id="an12"></div>
            <div id="an13"></div>
            <div id="an14"></div>
            <div id="an15"></div>
            <div id="an16"></div>
            <div id="an17"></div>
            <div id="an18"></div>
          </div>
          <div id="shadow"></div>
        </div>

        <h2 style={{ fontSize: '24px', margin: 0, textAlign: 'center' }}>Selecciona un horario</h2>

        <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '400px', flexDirection: 'column' }}>
          <button 
            className="md-btn md-btn-primary" 
            style={{ padding: '24px', fontSize: '20px', borderRadius: '16px' }}
            onClick={() => navigate('/schedule/rodrigo')}
          >
            Rodrigo
          </button>
          
          <button 
            className="md-btn md-btn-tonal" 
            style={{ padding: '24px', fontSize: '20px', borderRadius: '16px', backgroundColor: 'var(--tag-purple)', color: 'var(--tag-on-purple)' }}
            onClick={() => navigate('/schedule/hannah')}
          >
            Hannah
          </button>
        </div>

        {isOffline && (
          <div style={{ 
            backgroundColor: 'var(--md-sys-color-error-container)', 
            color: 'var(--md-sys-color-on-error-container)', 
            padding: '8px 16px', 
            borderRadius: '24px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: 'auto'
          }}>
            <span>⚠️</span> Estás en modo sin conexión (pero aún puedes ver los horarios)
          </div>
        )}

      </div>
    </div>
  );
}

export default ScheduleSelection;
