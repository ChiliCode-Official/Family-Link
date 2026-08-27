import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { safeStorage } from '../services/storage';
import '../styles/todo-checkbox.css';

function ToDo() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [nickname, setNickname] = useState(safeStorage.get('familyNickname', ''));
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [filter, setFilter] = useState('todas'); // 'todas', 'pendientes', 'completadas'

  // Listen to auth state
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Listen to user's private todos
  useEffect(() => {
    if (!currentUser && !nickname) {
      setTodos([]);
      return;
    }

    // Filter by user ID if logged in, otherwise by local nickname
    const userIdentifier = currentUser ? currentUser.uid : nickname;
    const field = currentUser ? 'userId' : 'authorName';

    const q = query(collection(db, 'todos'), where(field, '==', userIdentifier));
    const unsub = onSnapshot(q, snapshot => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTodos(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });

    return () => unsub();
  }, [currentUser, nickname]);

  const handleAddTodo = async (e) => {
    if (e) e.preventDefault();
    if (!newTodoText.trim()) return;

    if (!currentUser && !nickname) {
      alert("Por favor inicia sesión con Google o configura tu apodo para guardar tus notas privadas.");
      return;
    }

    const userIdentifier = currentUser ? currentUser.uid : nickname;

    await addDoc(collection(db, 'todos'), {
      text: newTodoText.trim(),
      completed: false,
      userId: currentUser ? currentUser.uid : '',
      authorName: nickname || currentUser?.displayName || 'Usuario',
      createdAt: Date.now()
    });

    setNewTodoText('');
  };

  const handleToggleComplete = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'todos', id), {
        completed: !currentStatus
      });
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
    }
  };

  const deleteCompletedTodos = async () => {
    const completedList = todos.filter(t => t.completed);
    for (let t of completedList) {
      await deleteDoc(doc(db, 'todos', t.id));
    }
  };

  // Filtered view
  const filteredTodos = todos.filter(t => {
    if (filter === 'pendientes') return !t.completed;
    if (filter === 'completadas') return t.completed;
    return true;
  });

  const pendingCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--theme-surface, #1e1e1e)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <button 
          className="back-btn" 
          onClick={() => navigate('/')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent',
            color: 'var(--theme-text, #ffffff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            padding: 0
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--theme-text, #ffffff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span> Mis Pendientes (To Do)
          </h1>
          <span style={{ fontSize: '12px', color: 'var(--theme-text-variant, #888)' }}>
            🔒 Lista personal y privada de {nickname || currentUser?.displayName?.split(' ')[0] || 'ti'}
          </span>
        </div>

        {completedCount > 0 && (
          <button 
            className="md-btn" 
            style={{ marginLeft: 'auto', color: '#ff4b4b', fontWeight: '600', fontSize: '13px' }} 
            onClick={deleteCompletedTodos}
          >
            Limpiar completadas
          </button>
        )}
      </header>

      {/* Filter Tabs */}
      <div style={{ padding: '12px 24px 6px', display: 'flex', gap: '8px', overflowX: 'auto', backgroundColor: 'var(--theme-bg, #121212)', flexShrink: 0 }}>
        <button
          onClick={() => setFilter('todas')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            backgroundColor: filter === 'todas' ? 'var(--theme-accent, #006493)' : 'var(--theme-surface-variant, #2c2c2c)',
            color: filter === 'todas' ? 'var(--theme-accent-text, #ffffff)' : 'var(--theme-text, #ffffff)',
            transition: 'all 0.2s'
          }}
        >
          Todas ({todos.length})
        </button>

        <button
          onClick={() => setFilter('pendientes')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            backgroundColor: filter === 'pendientes' ? 'var(--theme-accent, #006493)' : 'var(--theme-surface-variant, #2c2c2c)',
            color: filter === 'pendientes' ? 'var(--theme-accent-text, #ffffff)' : 'var(--theme-text, #ffffff)',
            transition: 'all 0.2s'
          }}
        >
          Pendientes ({pendingCount})
        </button>

        <button
          onClick={() => setFilter('completadas')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            backgroundColor: filter === 'completadas' ? 'var(--theme-accent, #006493)' : 'var(--theme-surface-variant, #2c2c2c)',
            color: filter === 'completadas' ? 'var(--theme-accent-text, #ffffff)' : 'var(--theme-text, #ffffff)',
            transition: 'all 0.2s'
          }}
        >
          Completadas ({completedCount})
        </button>
      </div>

      {/* Input Box */}
      <div style={{ padding: '16px 24px', backgroundColor: 'var(--theme-surface, #1e1e1e)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          <input 
            type="text" 
            placeholder="Escribe una nueva tarea pendiente..." 
            value={newTodoText} 
            onChange={(e) => setNewTodoText(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '14px 18px', 
              borderRadius: '24px', 
              border: '1.5px solid rgba(255,255,255,0.1)', 
              fontSize: '15px', 
              outline: 'none',
              backgroundColor: 'var(--theme-bg, #121212)',
              color: 'var(--theme-text, #ffffff)',
              transition: 'border-color 0.2s',
              minWidth: 0
            }}
          />

          <button 
            type="submit"
            className="md-btn md-btn-primary" 
            style={{ 
              borderRadius: '24px', 
              padding: '12px 22px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              flexShrink: 0,
              backgroundColor: 'var(--theme-accent, #006493)',
              color: 'var(--theme-accent-text, #ffffff)',
              fontWeight: '700'
            }} 
          >
            <span>+</span> Agregar
          </button>
        </form>
      </div>

      {/* Todo List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredTodos.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--theme-text-variant, #888)', gap: '16px', padding: '40px 0' }}>
            {/* Animated Empty State Loader (Shoh2008) */}
            <div style={{ padding: '20px 0 10px 0' }}>
              <div className="todo-empty-loader"></div>
            </div>

            <span style={{ fontSize: '17px', fontWeight: '600', color: 'var(--theme-text, #ffffff)', marginTop: '8px', textAlign: 'center' }}>
              {filter === 'completadas' 
                ? 'No tienes tareas completadas aún' 
                : (filter === 'pendientes' ? '¡Todo limpio! No tienes tareas pendientes' : 'Tu lista de pendientes está vacía')}
            </span>
            <span style={{ fontSize: '13px', opacity: 0.75, textAlign: 'center', maxWidth: '280px' }}>
              {filter === 'completadas' 
                ? 'Las tareas que completes aparecerán aquí.' 
                : 'Escribe algo arriba y presiona Agregar para guardarlo en tu lista privada.'}
            </span>
          </div>
        )}

        {filteredTodos.map(todo => (
          <div 
            key={todo.id}
            className="md-card md-card-elevated"
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--theme-surface, #1e1e1e)',
              padding: '16px 20px',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.04)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              gap: '16px',
              transition: 'all 0.25s ease',
              opacity: todo.completed ? 0.65 : 1
            }}
          >
            {/* Custom Animated Checkbox from Uiverse */}
            <label className="container" style={{ margin: 0 }}>
              <input 
                type="checkbox" 
                checked={todo.completed} 
                onChange={() => handleToggleComplete(todo.id, todo.completed)} 
              />
              <div className="checkmark"></div>
            </label>

            {/* Todo Title & Date */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
              <span style={{
                fontSize: '16px',
                fontWeight: '500',
                textDecoration: todo.completed ? 'line-through' : 'none',
                color: todo.completed ? 'var(--theme-text-variant, #888)' : 'var(--theme-text, #ffffff)',
                wordBreak: 'break-word',
                transition: 'all 0.2s'
              }}>
                {todo.text}
              </span>
              {todo.createdAt && (
                <span style={{ fontSize: '11px', color: 'var(--theme-text-variant, #666)' }}>
                  {new Date(todo.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>

            {/* Delete button */}
            <button 
              onClick={() => handleDeleteTodo(todo.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
                color: 'var(--theme-text-variant, #888)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 75, 75, 0.15)';
                e.currentTarget.style.color = '#ff4b4b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--theme-text-variant, #888)';
              }}
              title="Eliminar tarea"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ToDo;
