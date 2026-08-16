import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import '../styles/checkbox.css';

function Groceries() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [nickname, setNickname] = useState(localStorage.getItem('familyNickname') || '');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'groceries'), snapshot => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    if (!auth.currentUser || !nickname) {
      alert("Inicia sesión y configura tu apodo en el Home primero.");
      return;
    }
    
    await addDoc(collection(db, 'groceries'), {
      text: newItemText.trim(),
      completed: false,
      authorId: auth.currentUser.uid,
      authorName: nickname,
      authorPic: auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${nickname}&background=random`
    });
    
    setNewItemText('');
  };

  const toggleItem = async (id, currentStatus) => {
    await updateDoc(doc(db, 'groceries', id), { completed: !currentStatus });
  };

  const deleteCompleted = async () => {
    const completedItems = items.filter(i => i.completed);
    for (let item of completedItems) {
      await deleteDoc(doc(db, 'groceries', item.id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--md-sys-color-background)' }}>
      {/* Header */}
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--md-sys-color-surface)', boxShadow: 'var(--md-sys-elevation-1)' }}>
        <button className="md-btn md-btn-tonal" style={{ padding: '0 12px' }} onClick={() => navigate('/')}>←</button>
        <h1 style={{ margin: 0, fontSize: '22px' }}>Lista del Súper</h1>
        {items.some(i => i.completed) && (
          <button className="md-btn" style={{ marginLeft: 'auto', color: 'var(--md-sys-color-error)' }} onClick={deleteCompleted}>
            Limpiar Completados
          </button>
        )}
      </header>

      {/* Input */}
      <div style={{ padding: '16px', backgroundColor: 'var(--md-sys-color-surface-variant)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Añadir algo a la lista..." 
            value={newItemText} 
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--md-sys-color-outline)', fontSize: '16px', outline: 'none' }}
          />
          <button className="md-btn md-btn-primary" style={{ borderRadius: '24px', padding: '0 20px' }} onClick={handleAddItem}>
            Añadir
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--md-sys-color-on-surface-variant)' }}>La lista está vacía.</div>
        )}
        {items.map(item => (
          <div key={item.id} className="md-card md-card-elevated" style={{ display: 'flex', alignItems: 'center', opacity: item.completed ? 0.6 : 1, transition: 'opacity 0.3s' }}>
            
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={item.completed} 
                onChange={() => toggleItem(item.id, item.completed)} 
              />
              <div className="checkmark"></div>
            </label>

            <span style={{ 
              flex: 1, 
              fontSize: '18px', 
              textDecoration: item.completed ? 'line-through' : 'none',
              color: item.completed ? 'var(--md-sys-color-on-surface-variant)' : 'var(--md-sys-color-on-surface)',
              marginLeft: '12px'
            }}>
              {item.text}
            </span>

            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--md-sys-color-on-surface-variant)' }}>{item.authorName}</span>
              <img src={item.authorPic} alt={item.authorName} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

export default Groceries;
