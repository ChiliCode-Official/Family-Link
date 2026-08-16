import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 6); // 6 to 17

const INITIAL_SCHEDULE = [
  { id: 1, day: 'Lunes', start: 7, end: 9, title: 'Física', location: '34-F115' },
  { id: 2, day: 'Martes', start: 8, end: 10, title: 'Estrategias de Aprendizaje', location: '' },
  { id: 3, day: 'Martes', start: 13, end: 14.5, title: 'Química', location: '' },
  { id: 4, day: 'Martes', start: 14.5, end: 16, title: 'Inglés General IV', location: '34-F212' },
  { id: 5, day: 'Miércoles', start: 9, end: 11, title: 'Arquitectura de Computadoras', location: '' },
  { id: 6, day: 'Viernes', start: 7, end: 9, title: 'Física', location: '' },
  { id: 7, day: 'Viernes', start: 11, end: 13, title: 'Álgebra', location: '34-COMF209' },
  { id: 8, day: 'Viernes', start: 13, end: 14.5, title: 'Álgebra', location: '' },
  { id: 9, day: 'Viernes', start: 14.5, end: 16, title: 'Inglés General IV', location: '34-F212' },
  { id: 10, day: 'Sábado', start: 7, end: 9, title: 'Química', location: '34-D102' },
];

function Schedule() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(INITIAL_SCHEDULE);
  const [editingEvent, setEditingEvent] = useState(null);

  const handleEdit = (event) => {
    setEditingEvent({ ...event });
  };

  const handleSave = () => {
    if (editingEvent.id) {
      setEvents(events.map(e => e.id === editingEvent.id ? editingEvent : e));
    } else {
      setEvents([...events, { ...editingEvent, id: Date.now() }]);
    }
    setEditingEvent(null);
  };

  const handleDelete = () => {
    setEvents(events.filter(e => e.id !== editingEvent.id));
    setEditingEvent(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--md-sys-color-background)' }}>
      {/* App Bar */}
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--md-sys-color-surface)', boxShadow: 'var(--md-sys-elevation-1)', zIndex: 10 }}>
        <button className="md-btn md-btn-tonal" style={{ padding: '0 12px' }} onClick={() => navigate('/')}>
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '22px' }}>Horario UVM</h1>
        <button className="md-btn md-btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setEditingEvent({ day: 'Lunes', start: 7, end: 8, title: '', location: '' })}>
          + Nuevo
        </button>
      </header>

      {/* Grid Container */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(6, minmax(120px, 1fr))', gap: '8px', position: 'relative' }}>
          
          {/* Header Row */}
          <div style={{ position: 'sticky', top: 0, background: 'var(--md-sys-color-background)', zIndex: 5 }}></div>
          {DAYS.map(day => (
            <div key={day} style={{ position: 'sticky', top: 0, background: 'var(--md-sys-color-background)', zIndex: 5, textAlign: 'center', fontWeight: '500', paddingBottom: '8px' }}>
              {day}
            </div>
          ))}

          {/* Time Column & Grid Lines */}
          {HOURS.map(hour => (
            <React.Fragment key={hour}>
              <div style={{ textAlign: 'right', paddingRight: '8px', fontSize: '12px', color: 'var(--md-sys-color-outline)', transform: 'translateY(-6px)' }}>
                {hour.toString().padStart(2, '0')}:00
              </div>
              {DAYS.map(day => (
                <div key={`${day}-${hour}`} style={{ borderTop: '1px dashed var(--md-sys-color-surface-variant)', height: '60px' }}></div>
              ))}
            </React.Fragment>
          ))}

          {/* Events */}
          {events.map(event => {
            const dayIndex = DAYS.indexOf(event.day);
            if (dayIndex === -1) return null;
            
            const top = (event.start - 6) * 60 + 24; // 24px is header offset
            const height = (event.end - event.start) * 60;

            return (
              <div 
                key={event.id}
                onClick={() => handleEdit(event)}
                style={{
                  position: 'absolute',
                  top: `${top}px`,
                  left: `calc(50px + ${dayIndex} * ((100% - 50px) / 6) + 4px)`,
                  width: `calc(((100% - 50px) / 6) - 8px)`,
                  height: `${height - 4}px`,
                  backgroundColor: 'var(--md-sys-color-error-container)',
                  color: 'var(--md-sys-color-on-error-container)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ fontWeight: '500' }}>{event.title}</div>
                {event.location && <div>{event.location}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="md-card md-card-elevated" style={{ width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0 }}>{editingEvent.id ? 'Editar Clase' : 'Nueva Clase'}</h2>
            
            <input 
              style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)', fontFamily: 'inherit' }}
              value={editingEvent.title} 
              onChange={e => setEditingEvent({...editingEvent, title: e.target.value})}
              placeholder="Nombre de la clase"
            />
            
            <input 
              style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)', fontFamily: 'inherit' }}
              value={editingEvent.location} 
              onChange={e => setEditingEvent({...editingEvent, location: e.target.value})}
              placeholder="Salón (ej. 34-F115)"
            />

            <select 
              style={{ padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)', fontFamily: 'inherit' }}
              value={editingEvent.day} 
              onChange={e => setEditingEvent({...editingEvent, day: e.target.value})}
            >
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number" step="0.5"
                style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)' }}
                value={editingEvent.start} 
                onChange={e => setEditingEvent({...editingEvent, start: parseFloat(e.target.value)})}
                placeholder="Hora inicio (ej. 7.5)"
              />
              <input 
                type="number" step="0.5"
                style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)' }}
                value={editingEvent.end} 
                onChange={e => setEditingEvent({...editingEvent, end: parseFloat(e.target.value)})}
                placeholder="Hora fin (ej. 9)"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              {editingEvent.id && (
                <button className="md-btn" style={{ color: 'var(--md-sys-color-error)', marginRight: 'auto' }} onClick={handleDelete}>
                  Eliminar
                </button>
              )}
              <button className="md-btn" onClick={() => setEditingEvent(null)}>Cancelar</button>
              <button className="md-btn md-btn-primary" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
