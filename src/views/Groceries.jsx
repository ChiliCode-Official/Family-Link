import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import '../styles/checkbox.css';

const HOUSES = ['General', 'Casa Mamá', 'Casa Tlal', 'Casa Tía'];

const DICTIONARY = [
  'Leche', 'Huevo', 'Pan', 'Tortillas', 'Manzanas', 'Plátanos', 'Queso', 'Jamón', 
  'Pollo', 'Carne', 'Pescado', 'Arroz', 'Frijoles', 'Papel Higiénico', 'Jabón', 
  'Detergente', 'Café', 'Azúcar', 'Sal', 'Aceite', 'Refresco', 'Agua', 'Cereal', 
  'Yogur', 'Pasta', 'Atún', 'Cebolla', 'Jitomate', 'Limón', 'Aguacate', 'Ajo', 
  'Papas', 'Zanahorias', 'Lechuga', 'Cerveza', 'Vino', 'Galletas', 'Pan dulce'
];

function Groceries() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [selectedHouse, setSelectedHouse] = useState('General');
  const [activeHouseFilter, setActiveHouseFilter] = useState('Todas');
  const [nickname, setNickname] = useState(localStorage.getItem('familyNickname') || '');
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  
  // Undo Toast state
  const [lastDeletedItem, setLastDeletedItem] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastTimeoutId, setToastTimeoutId] = useState(null);

  // Suggestion filtering hook
  useEffect(() => {
    const text = newItemText.trim();
    if (!text) {
      setSuggestions([]);
      return;
    }
    const filtered = DICTIONARY.filter(item => 
      item.toLowerCase().startsWith(text.toLowerCase()) &&
      item.toLowerCase() !== text.toLowerCase()
    );
    setSuggestions(filtered);
  }, [newItemText]);

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
      house: selectedHouse,
      authorId: auth.currentUser.uid,
      authorName: nickname,
      authorPic: auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${nickname}&background=random`,
      createdAt: Date.now()
    });
    
    setNewItemText('');
  };

  const toggleItem = async (id, currentStatus) => {
    await updateDoc(doc(db, 'groceries', id), { completed: !currentStatus });
  };

  const handleDeleteItem = async (item) => {
    // Clear any existing toast timeout
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }

    // Save backup of item to restore if undo is clicked
    setLastDeletedItem(item);
    setShowToast(true);

    // Delete item from Firestore
    await deleteDoc(doc(db, 'groceries', item.id));

    // Hide toast after 5 seconds
    const timeout = setTimeout(() => {
      setShowToast(false);
      setLastDeletedItem(null);
    }, 5000);
    setToastTimeoutId(timeout);
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedItem) return;

    // Restore item to Firestore
    const { id, ...itemData } = lastDeletedItem;
    await addDoc(collection(db, 'groceries'), itemData);

    // Clear undo state
    setShowToast(false);
    setLastDeletedItem(null);
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      setToastTimeoutId(null);
    }
  };

  const deleteCompleted = async () => {
    const completedItems = items.filter(i => i.completed && (activeHouseFilter === 'Todas' || i.house === activeHouseFilter));
    for (let item of completedItems) {
      await deleteDoc(doc(db, 'groceries', item.id));
    }
  };

  // Filter items based on house selection
  const filteredItems = items.filter(item => {
    return activeHouseFilter === 'Todas' || item.house === activeHouseFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)' }}>
      {/* Header */}
      <header style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--theme-surface, #1e1e1e)', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))', flexShrink: 0 }}>
        <button className="back-btn" style={{ padding: '0' }} onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--theme-text, #ffffff)' }}>Lista del Súper</h1>
        {filteredItems.some(i => i.completed) && (
          <button className="md-btn" style={{ marginLeft: 'auto', color: '#ff4b4b', fontWeight: '600' }} onClick={deleteCompleted}>
            Limpiar Completados
          </button>
        )}
      </header>

      {/* House Filter Tabs */}
      <div style={{ padding: '12px 24px 4px', display: 'flex', gap: '8px', overflowX: 'auto', backgroundColor: 'var(--theme-bg, #121212)', flexShrink: 0 }}>
        {['Todas', ...HOUSES].map(house => (
          <button
            key={house}
            onClick={() => {
              setActiveHouseFilter(house);
              if (house !== 'Todas') setSelectedHouse(house);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              backgroundColor: activeHouseFilter === house ? 'var(--theme-accent, #006493)' : 'var(--theme-surface-variant, #2c2c2c)',
              color: activeHouseFilter === house ? 'var(--theme-accent-text, #ffffff)' : 'var(--theme-text, #ffffff)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {house}
          </button>
        ))}
      </div>

      {/* Input controls */}
      <div style={{ padding: '16px 24px', backgroundColor: 'var(--theme-surface, #1e1e1e)', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
          <input 
            type="text" 
            placeholder="Añadir algo a la lista..." 
            value={newItemText} 
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            style={{ 
              flex: 1, 
              padding: '12px 16px', 
              borderRadius: '24px', 
              border: '1.5px solid var(--border, rgba(255,255,255,0.15))', 
              fontSize: '16px', 
              outline: 'none',
              backgroundColor: 'var(--theme-bg, #121212)',
              color: 'var(--theme-text, #ffffff)',
              transition: 'border-color 0.2s',
              minWidth: 0
            }}
          />
          
          {/* House selector dropdown */}
          <select
            value={selectedHouse}
            onChange={(e) => setSelectedHouse(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '24px',
              border: '1.5px solid var(--border, rgba(255,255,255,0.15))',
              backgroundColor: 'var(--theme-bg, #121212)',
              color: 'var(--theme-text, #ffffff)',
              fontSize: '14px',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {HOUSES.map(house => (
              <option key={house} value={house}>{house}</option>
            ))}
          </select>

          <button 
            className="md-btn md-btn-primary" 
            style={{ borderRadius: '24px', padding: '12px 24px', height: '45px', display: 'flex', alignItems: 'center', flexShrink: 0 }} 
            onClick={handleAddItem}
          >
            Añadir
          </button>
        </div>
        
        {/* Suggestion list */}
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
            {suggestions.map(sug => (
              <button
                key={sug}
                onClick={() => {
                  setNewItemText(sug);
                  setSuggestions([]);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1.5px solid var(--theme-accent, #006493)',
                  backgroundColor: 'rgba(var(--theme-accent-rgb, 0, 100, 147), 0.08)',
                  color: 'var(--theme-accent, #006493)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-accent, #006493)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(var(--theme-accent-rgb, 0, 100, 147), 0.08)';
                  e.currentTarget.style.color = 'var(--theme-accent, #006493)';
                }}
              >
                💡 {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--theme-text-variant, #888)' }}>
            No hay elementos en la lista de {activeHouseFilter === 'Todas' ? 'las casas' : activeHouseFilter}.
          </div>
        )}
        
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className="md-card md-card-elevated" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              opacity: item.completed ? 0.6 : 1, 
              transition: 'opacity 0.3s',
              backgroundColor: 'var(--theme-surface, #1e1e1e)',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border, rgba(255,255,255,0.05))',
              position: 'relative'
            }}
          >
            
            <label className="checkbox-container" style={{ margin: 0 }}>
              <input 
                type="checkbox" 
                checked={item.completed} 
                onChange={() => toggleItem(item.id, item.completed)} 
              />
              <div className="checkmark"></div>
            </label>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '12px', gap: '4px' }}>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: '500',
                textDecoration: item.completed ? 'line-through' : 'none',
                color: item.completed ? 'var(--theme-text-variant, #888)' : 'var(--theme-text, #ffffff)'
              }}>
                {item.text}
              </span>
              
              {/* House Tag */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--theme-surface-variant, #2c2c2c)',
                  color: 'var(--theme-accent, #006493)'
                }}>
                  🏠 {item.house || 'General'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--theme-text-variant, #888)' }}>
                  Añadido por {item.authorName}
                </span>
              </div>
            </div>

            {/* Author Profile Pic & Delete Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img 
                src={item.authorPic} 
                alt={item.authorName} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--border, rgba(255,255,255,0.1))' }} 
              />
              
              {/* Trash/Delete button */}
              <button 
                onClick={() => handleDeleteItem(item)}
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
                title="Eliminar elemento"
              >
                🗑️
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Floating Undo Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#2e2e2e',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          minWidth: '280px',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            🗑️ Elemento eliminado
          </span>
          <button 
            onClick={handleUndoDelete}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--theme-accent, #00baec)',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px 8px',
              borderRadius: '8px'
            }}
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
}

export default Groceries;
