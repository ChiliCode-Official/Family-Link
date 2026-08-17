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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--theme-surface, #1e1e1e)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
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
      <div style={{ padding: '16px 24px', backgroundColor: 'var(--theme-surface, #1e1e1e)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
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
              border: '1.5px solid rgba(255,255,255,0.08)', 
              fontSize: '16px', 
              outline: 'none',
              backgroundColor: 'var(--theme-bg, #121212)',
              color: 'var(--theme-text, #ffffff)',
              transition: 'border-color 0.2s',
              minWidth: 0
            }}
          />
          
          {/* House selector dropdown */}
          <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
            <select
              value={selectedHouse}
              onChange={(e) => setSelectedHouse(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                padding: '12px 36px 12px 16px',
                borderRadius: '24px',
                border: '1.5px solid rgba(255,255,255,0.08)',
                backgroundColor: 'var(--theme-bg, #121212)',
                color: 'var(--theme-text, #ffffff)',
                fontSize: '14px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {HOUSES.map(house => (
                <option key={house} value={house}>{house}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--theme-text-variant, #888)', display: 'flex', alignItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

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
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', padding: '20px 0' }}>
            <style>{`
              .cat-loader {
                width: fit-content;
                height: fit-content;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .cat-wrapper {
                width: fit-content;
                height: fit-content;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              .catContainer {
                width: 100%;
                height: fit-content;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
              }
              .catbody {
                width: 80px;
              }
              .tail {
                position: absolute;
                width: 17px;
                top: 50%;
                animation: cat-tail 0.5s ease-in infinite alternate-reverse;
                transform-origin: top;
              }
              @keyframes cat-tail {
                0% {
                  transform: rotateZ(60deg);
                }
                50% {
                  transform: rotateZ(0deg);
                }
                100% {
                  transform: rotateZ(-20deg);
                }
              }
              .wall {
                width: 260px;
              }
              .cat-text {
                display: flex;
                flex-direction: column;
                width: 50px;
                position: absolute;
                margin: 0px 0px 100px 120px;
              }
              .cat-zzz {
                color: var(--theme-text, #ffffff);
                font-weight: 700;
                font-size: 15px;
                animation: cat-zzz-anim 2s linear infinite;
              }
              .cat-bigzzz {
                color: var(--theme-text, #ffffff);
                font-weight: 700;
                font-size: 25px;
                margin-left: 10px;
                animation: cat-zzz-anim 2.3s linear infinite;
              }
              @keyframes cat-zzz-anim {
                0% {
                  color: transparent;
                }
                50% {
                  color: var(--theme-text, #ffffff);
                }
                100% {
                  color: transparent;
                }
              }
            `}</style>
            
            <div className="cat-loader">
              <div className="cat-wrapper">
                <div className="catContainer">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 733 673"
                    className="catbody"
                  >
                    <path
                      fill="#5c5c5c"
                      d="M111.002 139.5C270.502 -24.5001 471.503 2.4997 621.002 139.5C770.501 276.5 768.504 627.5 621.002 649.5C473.5 671.5 246 687.5 111.002 649.5C-23.9964 611.5 -48.4982 303.5 111.002 139.5Z"
                    ></path>
                    <path fill="#5c5c5c" d="M184 9L270.603 159H97.3975L184 9Z"></path>
                    <path fill="#5c5c5c" d="M541 0L627.603 150H454.397L541 0Z"></path>
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 158 564"
                    className="tail"
                  >
                    <path
                      fill="#424242"
                      d="M5.97602 76.066C-11.1099 41.6747 12.9018 0 51.3036 0V0C71.5336 0 89.8636 12.2558 97.2565 31.0866C173.697 225.792 180.478 345.852 97.0691 536.666C89.7636 553.378 73.0672 564 54.8273 564V564C16.9427 564 -5.4224 521.149 13.0712 488.085C90.2225 350.15 87.9612 241.089 5.97602 76.066Z"
                    ></path>
                  </svg>
                  <div className="cat-text">
                    <span className="cat-bigzzz">Z</span>
                    <span className="cat-zzz">Z</span>
                  </div>
                </div>
                <div className="wallContainer">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 500 126"
                    className="wall"
                  >
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="3"
                      x2="450"
                      y1="3"
                      x1="50"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="85"
                      x2="400"
                      y1="85"
                      x1="100"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="122"
                      x2="375"
                      y1="122"
                      x1="125"
                    ></line>
                    <line strokeWidth="6" stroke="#7C7C7C" y2="43" x2="500" y1="43"></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="1.99391"
                      x2="115.5"
                      y1="43.0061"
                      x1="115.5"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="2.00002"
                      x2="189"
                      y1="43.0122"
                      x1="189"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="2.00612"
                      x2="262.5"
                      y1="43.0183"
                      x1="262.5"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="2.01222"
                      x2="336"
                      y1="43.0244"
                      x1="336"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="2.01833"
                      x2="409.5"
                      y1="43.0305"
                      x1="409.5"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="43"
                      x2="153"
                      y1="84.0122"
                      x1="153"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="43"
                      x2="228"
                      y1="84.0122"
                      x1="228"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="43"
                      x2="303"
                      y1="84.0122"
                      x1="303"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="43"
                      x2="378"
                      y1="84.0122"
                      x1="378"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="84"
                      x2="192"
                      y1="125.012"
                      x1="192"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="84"
                      x2="267"
                      y1="125.012"
                      x1="267"
                    ></line>
                    <line
                      strokeWidth="6"
                      stroke="#7C7C7C"
                      y2="84"
                      x2="342"
                      y1="125.012"
                      x1="342"
                    ></line>
                  </svg>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', color: 'var(--theme-text-variant, #888)', fontSize: '15px', fontWeight: '500', textAlign: 'center' }}>
              No hay elementos en la lista de {activeHouseFilter === 'Todas' ? 'las casas' : activeHouseFilter}.
            </div>
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
              borderRadius: '20px',
              border: 'none',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
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
