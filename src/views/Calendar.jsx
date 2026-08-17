import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import '../styles/event-card.css';
import '../styles/dog.css';

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const TAG_COLORS = [
  { id: 'red', bg: 'var(--tag-red)', text: 'var(--tag-on-red)' },
  { id: 'blue', bg: 'var(--tag-blue)', text: 'var(--tag-on-blue)' },
  { id: 'green', bg: 'var(--tag-green)', text: 'var(--tag-on-green)' },
  { id: 'yellow', bg: 'var(--tag-yellow)', text: 'var(--tag-on-yellow)' },
  { id: 'purple', bg: 'var(--tag-purple)', text: 'var(--tag-on-purple)' },
  { id: 'orange', bg: 'var(--tag-orange)', text: 'var(--tag-on-orange)' },
];

const DEFAULT_FAMILY_MEMBERS = ['Mamá', 'Papá', 'Hermano', 'Rodrigo', 'Hannah'];

function Calendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [nickname, setNickname] = useState(localStorage.getItem('familyNickname') || '');
  
  const [tags, setTags] = useState([]);
  const [events, setEvents] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventInfoOpen, setIsEventInfoOpen] = useState(false);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [selectedDayNumber, setSelectedDayNumber] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [newEvent, setNewEvent] = useState({ id: null, date: '', title: '', tagId: '', autoPickup: false, assignedTo: '' });

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', colorId: 'blue' });

  useEffect(() => {
    // 1. Listen to tags
    const unsubTags = onSnapshot(collection(db, 'tags'), snapshot => {
      setTags(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Listen to events
    const unsubEvents = onSnapshot(collection(db, 'events'), snapshot => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Listen to real registered users
    const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
      setRegisteredUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTags();
      unsubEvents();
      unsubUsers();
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Handler when clicking on a day box
  const handleDayClick = (day, dayEvents) => {
    setSelectedDayNumber(day);
    setSelectedDayEvents(dayEvents);
    if (dayEvents.length === 0) {
      // Day is empty: Open creation directly or day detail
      setNewEvent({ ...newEvent, date: day });
      setIsDayDetailOpen(true);
    } else {
      // Day has 1 or more events: Open Day Detail list so they can see all tasks and add more
      setIsDayDetailOpen(true);
    }
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsEventInfoOpen(true);
  };

  const handleEditClick = () => {
    setNewEvent(selectedEvent);
    setIsEventInfoOpen(false);
    setIsDayDetailOpen(false);
    setIsEventModalOpen(true);
  };

  const handleAddAnotherEventToDay = (day) => {
    if (!auth.currentUser || !nickname) {
      alert("Debes iniciar sesión con Google y configurar tu apodo primero.");
      return;
    }
    setNewEvent({ id: null, date: day || selectedDayNumber || '', title: '', tagId: '', autoPickup: false, assignedTo: '' });
    setIsDayDetailOpen(false);
    setIsEventModalOpen(true);
  };

  const handleWhatsApp = (eventObj) => {
    const ev = eventObj || selectedEvent;
    if (!ev) return;
    const text = `¡Hola! Tengo una sugerencia para el evento: *${ev.title}* (el día ${ev.date} de ${monthNames[month]}).`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDeleteEvent = async () => {
    if (newEvent.id) {
      await deleteDoc(doc(db, 'events', newEvent.id));
    }
    setIsEventModalOpen(false);
    resetEventState();
  };

  const handleSaveEvent = async (addAnother = false) => {
    if (!newEvent.title || !newEvent.date) {
      alert("Por favor escribe el título del evento/tarea.");
      return;
    }
    if (!auth.currentUser || !nickname) {
      alert("Debes iniciar sesión y configurar tu apodo primero.");
      return;
    }
    
    const isAuto = String(newEvent.tagId) === 'auto';
    const parsedDate = parseInt(newEvent.date);
    const dateMs = new Date(year, month, parsedDate).getTime();
    
    const eventData = { 
      title: newEvent.title.trim(),
      date: parsedDate, 
      month: month,
      year: year,
      dateMs: dateMs,
      tagId: newEvent.tagId || '', 
      autoPickup: isAuto, 
      assignedTo: newEvent.assignedTo || nickname,
      creatorName: newEvent.creatorName || nickname,
      creatorPic: newEvent.creatorPic || auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${nickname}&background=random`
    };

    if (newEvent.id) {
      await updateDoc(doc(db, 'events', newEvent.id), eventData);
      setIsEventModalOpen(false);
      resetEventState();
    } else {
      await addDoc(collection(db, 'events'), eventData);
      if (addAnother) {
        // Keep date, clear title for fast multi-task adding
        setNewEvent({ ...newEvent, title: '', tagId: '', autoPickup: false });
      } else {
        setIsEventModalOpen(false);
        resetEventState();
      }
    }
  };

  const resetEventState = () => {
    setNewEvent({ id: null, date: '', title: '', tagId: '', autoPickup: false, assignedTo: '' });
  };

  const handleSaveTag = async () => {
    if (!newTag.name.trim()) return;
    await addDoc(collection(db, 'tags'), { name: newTag.name.trim(), colorId: newTag.colorId });
    setIsTagModalOpen(false);
    setNewTag({ name: '', colorId: 'blue' });
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const getTagStyle = (tagId) => {
    if (String(tagId) === 'auto') return { bg: 'var(--tag-yellow)', text: 'var(--tag-on-yellow)' };
    const tag = tags.find(t => String(t.id) === String(tagId));
    return tag ? TAG_COLORS.find(tc => tc.id === tag.colorId) : { bg: 'hsl(var(--green-light))', text: 'var(--md-sys-color-on-surface)' };
  };

  // Filter events for the current displayed month
  const currentMonthEvents = events.filter(e => e.month === month && e.year === year);

  // Today logic
  const todayObj = new Date();
  const isToday = (day) => year === todayObj.getFullYear() && month === todayObj.getMonth() && day === todayObj.getDate();

  // Next event logic
  const nowMs = Date.now();
  const futureEvents = events.filter(e => e.dateMs >= nowMs - (1000 * 60 * 60 * 24)).sort((a, b) => a.dateMs - b.dateMs);
  const upcomingEvent = futureEvents.length > 0 ? futureEvents[0] : null;
  let nextEventText = "";
  if (upcomingEvent) {
    const diffMs = upcomingEvent.dateMs - nowMs;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0 || diffDays === -0) {
      nextEventText = `¡Hoy es: ${upcomingEvent.title}!`;
    } else if (diffDays === 1) {
      nextEventText = `Mañana es: ${upcomingEvent.title}`;
    } else {
      nextEventText = `Faltan ${diffDays} días para: ${upcomingEvent.title}`;
    }
  }

  // Real Family Members list
  const allMembers = registeredUsers.length > 0 
    ? registeredUsers.map(u => u.nickname || u.displayName).filter(Boolean)
    : DEFAULT_FAMILY_MEMBERS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--theme-bg, var(--md-sys-color-background))', width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Header */}
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--theme-surface, var(--md-sys-color-surface))', boxShadow: 'var(--md-sys-elevation-1)' }}>
        <button className="md-btn md-btn-tonal" style={{ padding: '0 12px' }} onClick={() => navigate('/')}>←</button>
        <h1 style={{ margin: 0, fontSize: '22px', color: 'var(--theme-text, var(--md-sys-color-on-surface))' }}>Calendario Familiar</h1>
        <button 
          className="md-btn md-btn-primary" 
          style={{ marginLeft: 'auto', backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)' }} 
          onClick={() => { 
            if (!auth.currentUser || !nickname) {
              alert("Debes iniciar sesión para agregar tareas o eventos");
            } else {
              resetEventState(); 
              setNewEvent({ id: null, date: todayObj.getDate(), title: '', tagId: '', autoPickup: false, assignedTo: '' });
              setIsEventModalOpen(true); 
            }
          }}
        >
          + Agregar Tarea / Evento
        </button>
      </header>

      {/* Upcoming Event Banner */}
      {upcomingEvent && (
        <div style={{ backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)', padding: '10px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>⏳</span> {nextEventText}
        </div>
      )}

      {/* Month Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
        <button className="md-btn md-btn-tonal" onClick={prevMonth}>&lt;</button>
        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--theme-text, var(--md-sys-color-on-background))', fontWeight: '700' }}>{monthNames[month]} {year}</h2>
        <button className="md-btn md-btn-tonal" onClick={nextMonth}>&gt;</button>
      </div>

      {/* Calendar Grid */}
      <div style={{ padding: '0 16px 24px', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px', fontWeight: '600', color: 'var(--theme-text-variant, gray)', fontSize: '13px' }}>
          <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, auto)', gap: '6px' }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = currentMonthEvents.filter(e => e.date === day);
            const todayClass = isToday(day) ? '2px solid var(--theme-accent, #006493)' : '1px solid var(--theme-surface-variant, rgba(255,255,255,0.08))';
            const todayBg = isToday(day) ? 'rgba(0,100,147, 0.08)' : 'var(--theme-surface, #1e1e1e)';

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day, dayEvents)}
                style={{ 
                  border: todayClass, 
                  borderRadius: '12px', 
                  padding: '6px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px', 
                  overflowY: 'auto', 
                  overflowX: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: todayBg,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: isToday(day) ? 'bold' : '600', 
                    color: isToday(day) ? 'var(--theme-accent-text, white)' : 'var(--theme-text, #ffffff)',
                    backgroundColor: isToday(day) ? 'var(--theme-accent, #006493)' : 'transparent',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>{day}</span>

                  {dayEvents.length > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 5px', borderRadius: '8px', backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)', opacity: 0.9 }}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event pills on the day cell */}
                {dayEvents.slice(0, 3).map(e => {
                  const tagStyle = getTagStyle(e.tagId);
                  const isAutoAlert = String(e.tagId) === 'auto' || e.autoPickup;

                  return (
                    <div 
                      key={e.id} 
                      onClick={(ev) => handleEventClick(ev, e)}
                      className={isAutoAlert ? "event-alert-auto" : ""}
                      style={{ 
                        backgroundColor: tagStyle.bg, 
                        color: tagStyle.text, 
                        fontSize: '11px', 
                        padding: '3px 6px', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        lineHeight: '1.2',
                        fontWeight: '600',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={`${e.title} (${e.assignedTo || 'Todos'})`}
                    >
                      <span>{isAutoAlert ? '🚗 ' : ''}{e.title}</span>
                    </div>
                  );
                })}

                {dayEvents.length > 3 && (
                  <span style={{ fontSize: '10px', color: 'var(--theme-text-variant, #888888)', textAlign: 'center', fontWeight: '600' }}>
                    +{dayEvents.length - 3} más...
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Modal (Shows all tasks on the clicked day & allows adding more) */}
      {isDayDetailOpen && selectedDayNumber && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div className="md-card md-card-elevated" style={{ width: '100%', maxWidth: '420px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', borderRadius: '24px', backgroundColor: 'var(--theme-surface, #1e1e1e)', color: 'var(--theme-text, #ffffff)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--theme-text, #ffffff)' }}>
                  📅 {selectedDayNumber} de {monthNames[month]}
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--theme-text-variant, #aaaaaa)' }}>
                  {currentMonthEvents.filter(e => e.date === selectedDayNumber).length} {currentMonthEvents.filter(e => e.date === selectedDayNumber).length === 1 ? 'tarea / evento' : 'tareas / eventos'}
                </span>
              </div>
              <button 
                onClick={() => setIsDayDetailOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--theme-text-variant, #888888)' }}
              >
                ✕
              </button>
            </div>

            {/* List of Tasks / Events for this day */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {currentMonthEvents.filter(e => e.date === selectedDayNumber).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--theme-text-variant, #888888)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🐶</div>
                  No hay tareas programadas para este día.<br/>
                  ¡Agrega la primera!
                </div>
              ) : (
                currentMonthEvents.filter(e => e.date === selectedDayNumber).map(ev => {
                  const tagStyle = getTagStyle(ev.tagId);
                  const isAuto = String(ev.tagId) === 'auto' || ev.autoPickup;

                  return (
                    <div 
                      key={ev.id}
                      onClick={(e) => handleEventClick(e, ev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--theme-bg, rgba(255,255,255,0.03))',
                        border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--theme-text, #ffffff)' }}>
                          {isAuto ? '🚗 ' : ''}{ev.title}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: tagStyle.bg, color: tagStyle.text, fontWeight: 'bold' }}>
                            {isAuto ? 'Pasar en Auto' : (tags.find(t => String(t.id) === String(ev.tagId))?.name || 'Evento')}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--theme-text-variant, #aaaaaa)' }}>
                            Para: {ev.assignedTo || 'Familia'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleWhatsApp(ev); }}
                          title="Compartir por WhatsApp"
                          style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          💬
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add another event button */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button 
                className="md-btn md-btn-primary" 
                style={{ flex: 1, backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)', borderRadius: '12px', padding: '12px', fontWeight: 'bold' }}
                onClick={() => handleAddAnotherEventToDay(selectedDayNumber)}
              >
                + Agregar Tarea / Evento a este Día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Info Modal */}
      {isEventInfoOpen && selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '20px' }}>
          <div className="md-card md-card-elevated" style={{ width: '90%', maxWidth: '380px', padding: '24px', borderRadius: '24px', backgroundColor: 'var(--theme-surface, #1e1e1e)', color: 'var(--theme-text, #ffffff)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: getTagStyle(selectedEvent.tagId).bg,
                color: getTagStyle(selectedEvent.tagId).text
              }}>
                {String(selectedEvent.tagId) === 'auto' ? '🚗 Pasar en Auto' : (tags.find(t => String(t.id) === String(selectedEvent.tagId))?.name || 'Evento')}
              </span>
              
              <button 
                onClick={() => setIsEventInfoOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--theme-text-variant, #888888)' }}
              >
                ✕
              </button>
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: 'var(--theme-text, #ffffff)' }}>{selectedEvent.title}</h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--theme-text-variant, #aaaaaa)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📅</span> {selectedEvent.date} de {monthNames[month]} {year}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', backgroundColor: 'var(--theme-bg, rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.04)' }}>
              <img 
                src={selectedEvent.creatorPic || `https://ui-avatars.com/api/?name=${selectedEvent.creatorName || 'Familia'}&background=random`} 
                alt="Creator Profile" 
                style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid var(--theme-accent, #006493)', objectFit: 'cover' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #ffffff)' }}>
                  Asignado a: {selectedEvent.assignedTo || 'Familia'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--theme-text-variant, #aaaaaa)' }}>
                  Creado por: {selectedEvent.creatorName || 'Familia'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '12px' }}>
              <button className="md-btn md-btn-tonal" onClick={handleEditClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', borderRadius: '12px' }}>
                ✏️ Editar
              </button>
              
              <button className="md-btn md-btn-primary" onClick={() => handleWhatsApp(selectedEvent)} style={{ backgroundColor: '#25D366', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center', borderRadius: '12px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                Compartir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Event Edit/Create Modal (with "+ Guardar y agregar otra tarea") */}
      {isEventModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 140, padding: '20px' }}>
          <div className="md-card md-card-elevated" style={{ width: '100%', maxWidth: '420px', padding: '24px', borderRadius: '24px', backgroundColor: 'var(--theme-surface, #1e1e1e)', color: 'var(--theme-text, #ffffff)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{newEvent.id ? 'Editar Tarea / Evento' : 'Nueva Tarea / Evento'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--theme-text-variant, #aaaaaa)' }}>📅 Día del mes ({monthNames[month]})</label>
              <input 
                type="number" 
                min="1" 
                max={daysInMonth} 
                placeholder={`Día (1-${daysInMonth})`} 
                value={newEvent.date} 
                onChange={e => setNewEvent({...newEvent, date: e.target.value})} 
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', outline: 'none', fontSize: '15px' }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--theme-text-variant, #aaaaaa)' }}>📝 Título de la tarea o evento</label>
              <input 
                placeholder="Ej. Comprar regalo, Examen UVM, Médico..." 
                value={newEvent.title} 
                onChange={e => setNewEvent({...newEvent, title: e.target.value})} 
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', outline: 'none', fontSize: '15px' }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--theme-text-variant, #aaaaaa)' }}>🏷️ Etiqueta</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={newEvent.tagId} 
                  onChange={e => setNewEvent({...newEvent, tagId: e.target.value})} 
                  style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', outline: 'none', fontSize: '14px', cursor: 'pointer' }}
                >
                  <option value="">Sin etiqueta</option>
                  <option value="auto">🚗 Pasar en Auto</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button className="md-btn md-btn-tonal" onClick={() => setIsTagModalOpen(true)} style={{ borderRadius: '12px', whiteSpace: 'nowrap' }}>+ Tag</button>
              </div>
            </div>

            {/* Asignar a familiar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: String(newEvent.tagId) === 'auto' ? '#ffb300' : 'var(--theme-text-variant, #aaaaaa)' }}>
                <span>{String(newEvent.tagId) === 'auto' ? '🚘 Responsable de recoger:' : '👤 Asignar a / Participante:'}</span>
              </label>
              <select 
                value={newEvent.assignedTo || ''} 
                onChange={e => setNewEvent({...newEvent, assignedTo: e.target.value})} 
                style={{ 
                  padding: '12px 14px', 
                  borderRadius: '12px', 
                  border: String(newEvent.tagId) === 'auto' ? '1.5px solid #ffb300' : '1px solid rgba(255,255,255,0.1)', 
                  backgroundColor: 'var(--theme-bg, #121212)', 
                  color: 'var(--theme-text, #ffffff)', 
                  outline: 'none', 
                  fontSize: '14px', 
                  cursor: 'pointer' 
                }}
              >
                <option value="">Familia / Todos</option>
                {allMembers.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                {newEvent.id ? (
                  <button className="md-btn" style={{ color: '#ff4b4b', fontWeight: '600' }} onClick={handleDeleteEvent}>
                    Borrar
                  </button>
                ) : <div></div>}
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="md-btn md-btn-tonal" onClick={() => { setIsEventModalOpen(false); resetEventState(); }} style={{ borderRadius: '12px' }}>
                    Cancelar
                  </button>
                  <button className="md-btn md-btn-primary" onClick={() => handleSaveEvent(false)} style={{ borderRadius: '12px', backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)' }}>
                    Guardar
                  </button>
                </div>
              </div>

              {!newEvent.id && (
                <button 
                  className="md-btn md-btn-tonal" 
                  onClick={() => handleSaveEvent(true)}
                  style={{ width: '100%', borderRadius: '12px', fontSize: '13px', fontWeight: '600', padding: '10px' }}
                >
                  ➕ Guardar y agregar otra tarea al día {newEvent.date}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Tag Modal */}
      {isTagModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
          <div className="md-card md-card-elevated" style={{ width: '80%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Nueva Etiqueta</h2>
            <input placeholder="Nombre (ej. Escuela)" value={newTag.name} onChange={e => setNewTag({...newTag, name: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--md-sys-color-outline)' }} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TAG_COLORS.map(tc => (
                <div key={tc.id} onClick={() => setNewTag({...newTag, colorId: tc.id})} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: tc.bg, cursor: 'pointer', border: newTag.colorId === tc.id ? '2px solid black' : 'none' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="md-btn" onClick={() => setIsTagModalOpen(false)}>Cancelar</button>
              <button className="md-btn md-btn-primary" onClick={handleSaveTag}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
