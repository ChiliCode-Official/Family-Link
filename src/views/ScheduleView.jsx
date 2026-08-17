import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00'
];

function ScheduleView() {
  const navigate = useNavigate();
  const { person } = useParams();
  const [scheduleData, setScheduleData] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ subject: '', room: '', endTime: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [zoom, setZoom] = useState(1.0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'schedules'), where('person', '==', person.toLowerCase()));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScheduleData(data);
    });
    return () => unsub();
  }, [person]);

  const currentDayIndex = currentTime.getDay() === 0 ? 6 : currentTime.getDay() - 1;
  const currentDayString = DAYS[currentDayIndex];
  const currentHourNum = currentTime.getHours();
  const currentHourString = currentHourNum < 10 ? `0${currentHourNum}:00` : `${currentHourNum}:00`;

  let nextClass = null;
  const todaysClasses = scheduleData.filter(s => s.day === currentDayString);
  const futureClassesToday = todaysClasses.filter(s => {
    const startHour = parseInt((s.startTime || s.time).split(':')[0]);
    const endHour = s.endTime ? parseInt(s.endTime.split(':')[0]) : startHour + 1;
    return endHour > currentHourNum;
  }).sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));
  
  if (futureClassesToday.length > 0) {
    const startHour = parseInt((futureClassesToday[0].startTime || futureClassesToday[0].time).split(':')[0]);
    if (startHour <= currentHourNum) {
      nextClass = { ...futureClassesToday[0], isNow: true };
    } else {
      nextClass = { ...futureClassesToday[0], isNow: false };
    }
  } else {
    for (let i = 1; i <= 7; i++) {
      const nextDayIdx = (currentDayIndex + i) % 7;
      const nextDayStr = DAYS[nextDayIdx];
      const classesNextDay = scheduleData.filter(s => s.day === nextDayStr).sort((a, b) => (a.startTime || a.time).localeCompare(b.startTime || b.time));
      if (classesNextDay.length > 0) {
        nextClass = { ...classesNextDay[0], isNow: false, nextDayName: nextDayStr };
        break;
      }
    }
  }

  const handleCellClick = (day, time, existingItem) => {
    if (existingItem === 'blocked') return;
    setSelectedSlot({ day, time, existingId: existingItem ? existingItem.id : null });
    
    let defaultEndTime = `${parseInt(time.split(':')[0]) + 1}:00`;
    if (defaultEndTime.length === 4) defaultEndTime = `0${defaultEndTime}`;

    setFormData({
      subject: existingItem ? existingItem.subject : '',
      room: existingItem ? existingItem.room : '',
      endTime: existingItem && existingItem.endTime ? existingItem.endTime : defaultEndTime
    });
    setIsModalOpen(true);
  };

  const handleSaveSlot = async () => {
    if (!formData.subject) return;
    if (selectedSlot.existingId) {
      await deleteDoc(doc(db, 'schedules', selectedSlot.existingId));
    }
    await addDoc(collection(db, 'schedules'), {
      person: person.toLowerCase(),
      day: selectedSlot.day,
      startTime: selectedSlot.time,
      endTime: formData.endTime,
      subject: formData.subject,
      room: formData.room
    });
    setIsModalOpen(false);
  };

  const handleDeleteSlot = async () => {
    if (selectedSlot.existingId) {
      await deleteDoc(doc(db, 'schedules', selectedSlot.existingId));
    }
    setIsModalOpen(false);
  };

  const gridCells = {};
  scheduleData.forEach(item => {
    const startHour = parseInt((item.startTime || item.time).split(':')[0]);
    const endHour = item.endTime ? parseInt(item.endTime.split(':')[0]) : startHour + 1;
    const duration = endHour - startHour;
    
    const startKey = `${item.day}-${startHour < 10 ? `0${startHour}:00` : `${startHour}:00`}`;
    gridCells[startKey] = { ...item, duration, isStart: true };

    for (let i = 1; i < duration; i++) {
      const spanHour = startHour + i;
      const spanKey = `${item.day}-${spanHour < 10 ? `0${spanHour}:00` : `${spanHour}:00`}`;
      gridCells[spanKey] = 'blocked';
    }
  });

  const getEndTimeOptions = (startTime) => {
    const start = parseInt(startTime.split(':')[0]);
    let opts = [];
    for (let i = start + 1; i <= 17; i++) {
      opts.push(i < 10 ? `0${i}:00` : `${i}:00`);
    }
    return opts;
  };

  return (
    <div className="schedule-container">
      <style>{`
        .schedule-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: var(--theme-bg, #f4f6f8);
          font-family: 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }
        .schedule-header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          background-color: var(--theme-surface, #ffffff);
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          flex-shrink: 0;
          z-index: 10;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .back-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.1);
          background: transparent;
          color: var(--theme-text, #1a1a1a);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background: rgba(0,0,0,0.05);
        }
        .schedule-title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          text-transform: capitalize;
          letter-spacing: -0.5px;
          color: var(--theme-text, #1a1a1a);
        }
        .status-banner {
          margin: 16px 24px 0;
          padding: 14px 20px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.06);
          animation: slideDown 0.4s ease-out forwards;
        }
        .status-banner.now {
          background: linear-gradient(135deg, #ff4b4b 0%, #d41e1e 100%);
          color: white;
        }
        .status-banner.next {
          background: linear-gradient(135deg, var(--theme-accent, #006493) 0%, var(--theme-accent-dark, #004d73) 100%);
          color: var(--theme-accent-text, white);
        }
        .grid-wrapper {
          flex: 1;
          overflow-x: auto;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px 16px 40px;
          width: 100%;
          box-sizing: border-box;
        }
        .grid-inner {
          width: 100%;
          min-width: 850px;
          background: var(--theme-surface, #ffffff);
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .days-header {
          display: flex;
          background: rgba(0,0,0,0.01);
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .corner-cell {
          width: 70px;
          flex-shrink: 0;
          border-right: 1px solid rgba(0,0,0,0.06);
        }
        .day-col-header {
          flex: 1;
          text-align: center;
          padding: 16px 8px;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--theme-text-variant, #666);
          border-right: 1px solid rgba(0,0,0,0.04);
        }
        .day-col-header:last-child {
          border-right: none;
        }
        .day-col-header.current {
          color: var(--theme-accent, #006493);
          background: rgba(var(--theme-accent-rgb, 0, 100, 147), 0.05);
        }
        .hour-row {
          display: flex;
          height: var(--row-height, 90px);
          border-bottom: 1px solid rgba(0,0,0,0.04);
          position: relative;
        }
        .hour-row:last-child {
          border-bottom: none;
        }
        .hour-label-container {
          width: 70px;
          flex-shrink: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 12px;
          border-right: 1px solid rgba(0,0,0,0.06);
          background: rgba(0,0,0,0.01);
        }
        .hour-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--theme-text-variant, #888);
          background: var(--theme-surface, #fff);
          padding: 4px 8px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .hour-row.current .hour-label {
          color: var(--theme-accent-text, #fff);
          background: var(--theme-accent, #006493);
          box-shadow: 0 4px 8px rgba(var(--theme-accent-rgb, 0, 100, 147), 0.3);
        }
        .time-line {
          position: absolute;
          top: 0;
          left: 70px;
          right: 0;
          height: 2px;
          background: var(--theme-accent, #ff4b4b);
          z-index: 5;
          box-shadow: 0 0 8px rgba(255, 75, 75, 0.4);
        }
        .time-dot {
          position: absolute;
          left: 66px;
          top: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--theme-accent, #ff4b4b);
          box-shadow: 0 0 0 3px var(--theme-surface, #fff);
        }
        .grid-cell {
          flex: 1;
          border-right: 1px solid rgba(0,0,0,0.04);
          padding: 4px;
          position: relative;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .grid-cell:last-child {
          border-right: none;
        }
        .grid-cell:hover {
          background-color: rgba(0,0,0,0.02);
        }
        .grid-cell.current-col {
          background-color: rgba(var(--theme-accent-rgb, 0, 100, 147), 0.02);
        }
        .grid-cell.current-col:hover {
          background-color: rgba(var(--theme-accent-rgb, 0, 100, 147), 0.05);
        }
        .class-card {
          position: absolute;
          top: 4px;
          left: 4px;
          right: 4px;
          z-index: 15;
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: linear-gradient(135deg, var(--theme-accent, #006493), var(--theme-accent-dark, #004d73));
          color: var(--theme-accent-text, #ffffff);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
          border: 1px solid rgba(255,255,255,0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .class-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
         .class-card.is-now {
          background: linear-gradient(135deg, #ff4b4b 0%, #d41e1e 100%);
          box-shadow: 0 0 16px rgba(255, 75, 75, 0.4);
          border: 2px solid #ffffff;
          animation: pulseGlow 2s infinite ease-in-out;
        }
        .class-card.is-next {
          background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
          box-shadow: 0 6px 16px rgba(138, 43, 226, 0.3);
          border: 1.5px solid rgba(255, 255, 255, 0.6);
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 8px rgba(255, 75, 75, 0.4); }
          50% { box-shadow: 0 0 20px rgba(255, 75, 75, 0.7); }
          100% { box-shadow: 0 0 8px rgba(255, 75, 75, 0.4); }
        }
        .class-title {
          font-size: calc(13px * var(--zoom-factor, 1));
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        .class-meta {
          font-size: calc(11px * var(--zoom-factor, 1));
          opacity: 0.9;
          font-weight: 500;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-card {
          width: 90%;
          max-width: 400px;
          background: var(--theme-surface, #fff);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-title {
          margin: 0;
          color: var(--theme-text, #1a1a1a);
          font-size: 20px;
          font-weight: 700;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--theme-text-variant, #666);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .styled-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.1);
          background: var(--theme-surface, #fff);
          color: var(--theme-text, #1a1a1a);
          font-size: 15px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .styled-input:focus {
          outline: none;
          border-color: var(--theme-accent, #006493);
          box-shadow: 0 0 0 3px rgba(var(--theme-accent-rgb, 0, 100, 147), 0.1);
        }
        .btn {
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background: var(--theme-accent, #006493);
          color: var(--theme-accent-text, #fff);
        }
        .btn-primary:hover {
          filter: brightness(1.1);
        }
        .btn-secondary {
          background: rgba(0,0,0,0.05);
          color: var(--theme-text, #1a1a1a);
        }
        .btn-secondary:hover {
          background: rgba(0,0,0,0.1);
        }
        .btn-danger {
          background: rgba(255, 75, 75, 0.1);
          color: #ff4b4b;
        }
        .btn-danger:hover {
          background: rgba(255, 75, 75, 0.2);
        }
      `}</style>

      <header className="schedule-header">
        <button className="back-btn" onClick={() => navigate('/schedule')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="schedule-title" style={{ textTransform: 'capitalize' }}>Horario de {person}</h1>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="back-btn" onClick={() => setZoom(Math.max(0.6, zoom - 0.1))} title="Alejar" style={{ fontSize: '14px' }}>
            ➖
          </button>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--theme-text-variant, #666)', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="back-btn" onClick={() => setZoom(Math.min(1.6, zoom + 0.1))} title="Acercar" style={{ fontSize: '14px' }}>
            ➕
          </button>
          <button className="back-btn" onClick={() => setZoom(1.0)} title="Restablecer" style={{ fontSize: '14px' }}>
            ↺
          </button>
        </div>
      </header>

      {nextClass && (
        <div className={`status-banner ${nextClass.isNow ? 'now' : 'next'}`}>
          {nextClass.isNow ? (
            <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> EN CURSO:</>
          ) : (
            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> PRÓXIMA CLASE:</>
          )} 
          {nextClass.subject} ({nextClass.startTime || nextClass.time}h) {nextClass.room ? `en ${nextClass.room}` : ''} {nextClass.nextDayName ? `el ${nextClass.nextDayName}` : ''}
        </div>
      )}

      <div className="grid-wrapper">
        <div className="grid-inner" style={{ '--row-height': `${90 * zoom}px`, '--zoom-factor': zoom }}>
          <div className="days-header">
            <div className="corner-cell"></div>
            {DAYS.map(day => (
              <div key={day} className={`day-col-header ${day === currentDayString ? 'current' : ''}`}>
                {day}
              </div>
            ))}
          </div>

          {HOURS.map(time => {
            const isCurrentHourRow = time === currentHourString;
            return (
              <div key={time} className={`hour-row ${isCurrentHourRow ? 'current' : ''}`}>
                <div className="hour-label-container">
                  <div className="hour-label">{time}</div>
                </div>

                {isCurrentHourRow && (
                  <>
                    <div className="time-line"></div>
                    <div className="time-dot"></div>
                  </>
                )}

                {DAYS.map(day => {
                  const cellKey = `${day}-${time}`;
                  const existingItem = gridCells[cellKey];
                  const isCurrentCell = isCurrentHourRow && day === currentDayString;
                  
                  // Timing detection for active/next class highlighting
                  const startHour = existingItem && existingItem !== 'blocked' ? parseInt((existingItem.startTime || existingItem.time).split(':')[0]) : null;
                  const endHour = existingItem && existingItem !== 'blocked' && existingItem.endTime ? parseInt(existingItem.endTime.split(':')[0]) : (startHour ? startHour + 1 : null);
                  const isNow = existingItem && existingItem !== 'blocked' && day === currentDayString && currentHourNum >= startHour && currentHourNum < endHour;
                  const isNext = existingItem && existingItem !== 'blocked' && nextClass && existingItem.id === nextClass.id && !isNow;
                  
                  return (
                    <div 
                      key={cellKey} 
                      className={`grid-cell ${day === currentDayString ? 'current-col' : ''}`}
                      onClick={() => handleCellClick(day, time, existingItem === 'blocked' ? null : existingItem)}
                      style={{ cursor: existingItem === 'blocked' ? 'default' : 'pointer' }}
                    >
                      {existingItem && existingItem !== 'blocked' && (
                        <div className={`class-card ${isNow ? 'is-now' : ''} ${isNext ? 'is-next' : ''}`} style={{ height: `calc(${existingItem.duration * 100}% + ${(existingItem.duration - 1) * 1}px)` }}>
                          <div className="class-title">{existingItem.subject}</div>
                          <div className="class-meta" style={{ fontWeight: '600' }}>
                            {isNow ? '🔴 En curso ' : isNext ? '⏰ Siguiente ' : ''}
                            {existingItem.room ? `🏫 ${existingItem.room}` : ''}
                          </div>
                          <div className="class-meta" style={{ marginTop: '2px', opacity: 0.8 }}>
                            🕒 {existingItem.startTime || existingItem.time} - {existingItem.endTime}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="modal-title">Clase el {selectedSlot.day}</h2>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Hora de Inicio</label>
                <div className="styled-input" style={{ background: 'rgba(0,0,0,0.02)', fontWeight: 'bold' }}>{selectedSlot.time}</div>
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Hora de Fin</label>
                <select className="styled-input" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})}>
                  {getEndTimeOptions(selectedSlot.time).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
            
            <div className="input-group">
              <label className="input-label">Materia / Clase</label>
              <input className="styled-input" placeholder="Ej. Matemáticas" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
            </div>
            
            <div className="input-group">
              <label className="input-label">Salón / Aula (Opcional)</label>
              <input className="styled-input" placeholder="Ej. Edificio B, Aula 102" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              {selectedSlot.existingId ? (
                <button className="btn btn-danger" onClick={handleDeleteSlot}>Borrar</button>
              ) : <div></div>}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSaveSlot}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleView;
