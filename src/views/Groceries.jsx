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
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px' }}>
            <style>{`
              .loader {
                --zoom: 0.3;
                position: absolute;
                top: 40%;
                left: 50%;
                transform: translate(-50%, -50%);
                --wh: calc(var(--wh-number) * 1px);
                --wh-n: calc(var(--wh-number) * -1px);
                width: calc(var(--wh-number) * var(--wh));
                height: calc(var(--wh-number) * var(--wh));
                --color: #fff;
                --blur: 0;
                filter: drop-shadow(var(--wh-n) 0 var(--blur) var(--color))
                  drop-shadow(0 var(--wh-n) var(--blur) var(--color))
                  drop-shadow(var(--wh) 0 var(--blur) var(--color))
                  drop-shadow(0 var(--wh) var(--blur) var(--color));
                image-rendering: pixelated;
                zoom: var(--zoom);
                animation: mover 0.3s linear infinite;
              }

              .loader .pixel {
                width: var(--wh);
                height: var(--wh);
                box-shadow: var(--shadow);
              }

              @keyframes mover {
                0%,
                100% {
                  --shadow: 0px 0px transparent, 24px 0px transparent, 48px 0px transparent,
                    72px 0px transparent, 96px 0px transparent, 120px 0px transparent,
                    144px 0px transparent, 168px 0px transparent, 192px 0px transparent,
                    216px 0px transparent, 240px 0px transparent, 264px 0px transparent,
                    288px 0px transparent, 312px 0px #535353, 336px 0px #535353,
                    360px 0px #535353, 384px 0px #535353, 408px 0px #535353, 432px 0px #535353,
                    456px 0px #535353, 480px 0px #535353, 504px 0px #535353, 528px 0px #535353,
                    552px 0px transparent, 0px 24px transparent, 24px 24px transparent,
                    48px 24px transparent, 72px 24px transparent, 96px 24px transparent,
                    120px 24px transparent, 144px 24px transparent, 168px 24px transparent,
                    192px 24px transparent, 216px 24px transparent, 240px 24px transparent,
                    264px 24px transparent, 288px 24px #535353, 312px 24px #535353,
                    336px 24px #535353, 360px 24px #535353, 384px 24px #535353,
                    408px 24px #535353, 432px 24px #535353, 456px 24px #535353,
                    480px 24px #535353, 504px 24px #535353, 528px 24px #535353,
                    552px 24px #535353, 0px 48px transparent, 24px 48px transparent,
                    48px 48px transparent, 72px 48px transparent, 96px 48px transparent,
                    120px 48px transparent, 144px 48px transparent, 168px 48px transparent,
                    192px 48px transparent, 216px 48px transparent, 240px 48px transparent,
                    264px 48px transparent, 288px 48px #535353, 312px 48px #535353,
                    336px 48px transparent, 360px 48px transparent, 384px 48px #535353,
                    408px 48px #535353, 432px 48px #535353, 456px 48px #535353,
                    480px 48px #535353, 504px 48px #535353, 528px 48px #535353,
                    552px 48px #535353, 0px 72px transparent, 24px 72px transparent,
                    48px 72px transparent, 72px 72px transparent, 96px 72px transparent,
                    120px 72px transparent, 144px 72px transparent, 168px 72px transparent,
                    192px 72px transparent, 216px 72px transparent, 240px 72px transparent,
                    264px 72px transparent, 288px 72px #535353, 312px 72px #535353,
                    336px 72px transparent, 360px 72px transparent, 384px 72px #535353,
                    408px 72px #535353, 432px 72px #535353, 456px 72px #535353,
                    480px 72px #535353, 504px 72px #535353, 528px 72px #535353,
                    552px 72px #535353, 0px 96px transparent, 24px 96px transparent,
                    48px 96px transparent, 72px 96px transparent, 96px 96px transparent,
                    120px 96px transparent, 144px 96px transparent, 168px 96px transparent,
                    192px 96px transparent, 216px 96px transparent, 240px 96px transparent,
                    264px 96px transparent, 288px 96px #535353, 312px 96px #535353,
                    336px 96px #535353, 360px 96px #535353, 384px 96px #535353,
                    408px 96px #535353, 432px 96px #535353, 456px 96px #535353,
                    480px 96px #535353, 504px 96px #535353, 528px 96px #535353,
                    552px 96px #535353, 0px 120px transparent, 24px 120px transparent,
                    48px 120px transparent, 72px 120px transparent, 96px 120px transparent,
                    120px 120px transparent, 144px 120px transparent, 168px 120px transparent,
                    192px 120px transparent, 216px 120px transparent, 240px 120px transparent,
                    264px 120px transparent, 288px 120px #535353, 312px 120px #535353,
                    336px 120px #535353, 360px 120px #535353, 384px 120px #535353,
                    408px 120px #535353, 432px 120px #535353, 456px 120px #535353,
                    480px 120px #535353, 504px 120px #535353, 528px 120px #535353,
                    552px 120px #535353, 0px 144px transparent, 24px 144px transparent,
                    48px 144px transparent, 72px 144px transparent, 96px 144px transparent,
                    120px 144px transparent, 144px 144px transparent, 168px 144px transparent,
                    192px 144px transparent, 216px 144px transparent, 240px 144px transparent,
                    264px 144px transparent, 288px 144px #535353, 312px 144px #535353,
                    336px 144px #535353, 360px 144px #535353, 384px 144px #535353,
                    408px 144px #535353, 432px 144px transparent, 456px 144px transparent,
                    480px 144px transparent, 504px 144px transparent, 528px 144px transparent,
                    552px 144px transparent, 0px 168px transparent, 24px 168px transparent,
                    48px 168px transparent, 72px 168px transparent, 96px 168px transparent,
                    120px 168px transparent, 144px 168px transparent, 168px 168px transparent,
                    192px 168px transparent, 216px 168px transparent, 240px 168px transparent,
                    264px 168px transparent, 288px 168px #535353, 312px 168px #535353,
                    336px 168px #535353, 360px 168px #535353, 384px 168px #535353,
                    408px 168px #535353, 432px 168px transparent, 456px 168px transparent,
                    480px 168px transparent, 504px 168px transparent, 528px 168px transparent,
                    552px 168px transparent, 0px 192px transparent, 24px 192px transparent,
                    48px 192px transparent, 72px 192px transparent, 96px 192px transparent,
                    120px 192px transparent, 144px 192px transparent, 168px 192px transparent,
                    192px 192px transparent, 216px 192px transparent, 240px 192px transparent,
                    264px 192px transparent, 288px 192px #535353, 312px 192px #535353,
                    336px 192px #535353, 360px 192px #535353, 384px 192px #535353,
                    408px 192px #535353, 432px 192px #535353, 456px 192px #535353,
                    480px 192px #535353, 504px 192px #535353, 528px 192px transparent,
                    552px 192px transparent, 0px 216px #535353, 24px 216px transparent,
                    48px 216px transparent, 72px 216px transparent, 96px 216px transparent,
                    120px 216px transparent, 144px 216px transparent, 168px 216px transparent,
                    192px 216px transparent, 216px 216px transparent, 240px 216px #535353,
                    264px 216px #535353, 288px 216px #535353, 312px 216px #535353,
                    336px 216px #535353, 360px 216px #535353, 384px 216px #535353,
                    408px 216px transparent, 432px 216px transparent, 456px 216px transparent,
                    480px 216px transparent, 504px 216px transparent, 528px 216px transparent,
                    552px 216px transparent, 0px 240px #535353, 24px 240px transparent,
                    48px 240px transparent, 72px 240px transparent, 96px 240px transparent,
                    120px 240px transparent, 144px 240px transparent, 168px 240px transparent,
                    192px 240px #535353, 216px 240px #535353, 240px 240px #535353,
                    264px 240px #535353, 288px 240px #535353, 312px 240px #535353,
                    336px 240px #535353, 360px 240px #535353, 384px 240px #535353,
                    408px 240px transparent, 432px 240px transparent, 456px 240px transparent,
                    480px 240px transparent, 504px 240px transparent, 528px 240px transparent,
                    552px 240px transparent, 0px 264px #535353, 24px 264px #535353,
                    48px 264px transparent, 72px 264px transparent, 96px 264px transparent,
                    120px 264px transparent, 144px 264px transparent, 168px 264px #535353,
                    192px 264px #535353, 216px 264px #535353, 240px 264px #535353,
                    264px 264px #535353, 288px 264px #535353, 312px 264px #535353,
                    336px 264px #535353, 360px 264px #535353, 384px 264px #535353,
                    408px 264px #535353, 432px 264px #535353, 456px 264px transparent,
                    480px 264px transparent, 504px 264px transparent, 528px 264px transparent,
                    552px 264px transparent, 0px 288px #535353, 24px 288px #535353,
                    48px 288px #535353, 72px 288px transparent, 96px 288px transparent,
                    120px 288px transparent, 144px 288px #535353, 168px 288px #535353,
                    192px 288px #535353, 216px 288px #535353, 240px 288px #535353,
                    264px 288px #535353, 288px 288px #535353, 312px 288px #535353,
                    336px 288px #535353, 360px 288px #535353, 384px 288px #535353,
                    408px 288px transparent, 432px 288px #535353, 456px 288px transparent,
                    480px 288px transparent, 504px 288px transparent, 528px 288px transparent,
                    552px 288px transparent, 0px 312px #535353, 24px 312px #535353,
                    48px 312px #535353, 72px 312px #535353, 96px 312px #535353,
                    120px 312px #535353, 144px 312px #535353, 168px 312px #535353,
                    192px 312px #535353, 216px 312px #535353, 240px 312px #535353,
                    264px 312px #535353, 288px 312px #535353, 312px 312px #535353,
                    336px 312px #535353, 360px 312px #535353, 384px 312px #535353,
                    408px 312px transparent, 432px 312px transparent, 456px 312px transparent,
                    480px 312px transparent, 504px 312px transparent, 528px 312px transparent,
                    552px 312px transparent, 0px 336px #535353, 24px 336px #535353,
                    48px 336px #535353, 72px 336px #535353, 96px 336px #535353,
                    120px 336px #535353, 144px 336px #535353, 168px 336px #535353,
                    192px 336px #535353, 216px 336px #535353, 240px 336px #535353,
                    264px 336px #535353, 288px 336px #535353, 312px 336px #535353,
                    336px 336px #535353, 360px 336px #535353, 384px 336px #535353,
                    408px 336px transparent, 432px 336px transparent, 456px 336px transparent,
                    480px 336px transparent, 504px 336px transparent, 528px 336px transparent,
                    552px 336px transparent, 0px 360px transparent, 24px 360px #535353,
                    48px 360px #535353, 72px 360px #535353, 96px 360px #535353,
                    120px 360px #535353, 144px 360px #535353, 168px 360px #535353,
                    192px 360px #535353, 216px 360px #535353, 240px 360px #535353,
                    264px 360px #535353, 288px 360px #535353, 312px 360px #535353,
                    336px 360px #535353, 360px 360px #535353, 384px 360px #535353,
                    408px 360px transparent, 432px 360px transparent, 456px 360px transparent,
                    480px 360px transparent, 504px 360px transparent, 528px 360px transparent,
                    552px 360px transparent, 0px 384px transparent, 24px 384px transparent,
                    48px 384px #535353, 72px 384px #535353, 96px 384px #535353,
                    120px 384px #535353, 144px 384px #535353, 168px 384px #535353,
                    192px 384px #535353, 216px 384px #535353, 240px 384px #535353,
                    264px 384px #535353, 288px 384px #535353, 312px 384px #535353,
                    336px 384px #535353, 360px 384px #535353, 384px 384px transparent,
                    408px 384px transparent, 432px 384px transparent, 456px 384px transparent,
                    480px 384px transparent, 504px 384px transparent, 528px 384px transparent,
                    552px 384px transparent, 0px 408px transparent, 24px 408px transparent,
                    48px 408px transparent, 72px 408px #535353, 96px 408px #535353,
                    120px 408px #535353, 144px 408px #535353, 168px 408px #535353,
                    192px 408px #535353, 216px 408px #535353, 240px 408px #535353,
                    264px 408px #535353, 288px 408px #535353, 312px 408px #535353,
                    336px 408px #535353, 360px 408px transparent, 384px 408px transparent,
                    408px 408px transparent, 432px 408px transparent, 456px 408px transparent,
                    480px 408px transparent, 504px 408px transparent, 528px 408px transparent,
                    552px 408px transparent, 0px 432px transparent, 24px 432px transparent,
                    48px 432px transparent, 72px 432px transparent, 96px 432px #535353,
                    120px 432px #535353, 144px 432px #535353, 168px 432px #535353,
                    192px 432px #535353, 216px 432px #535353, 240px 432px #535353,
                    264px 432px #535353, 288px 432px #535353, 312px 432px #535353,
                    336px 432px transparent, 360px 432px transparent, 384px 432px transparent,
                    408px 432px transparent, 432px 432px transparent, 456px 432px transparent,
                    480px 432px transparent, 504px 432px transparent, 528px 432px transparent,
                    552px 432px transparent, 0px 456px transparent, 24px 456px transparent,
                    48px 456px transparent, 72px 456px transparent, 96px 456px transparent,
                    120px 456px #535353, 144px 456px #535353, 168px 456px #535353,
                    192px 456px #535353, 216px 456px #535353, 240px 456px #535353,
                    264px 456px #535353, 288px 456px #535353, 312px 456px transparent,
                    336px 456px transparent, 360px 456px transparent, 384px 456px transparent,
                    408px 456px transparent, 432px 456px transparent, 456px 456px transparent,
                    480px 456px transparent, 504px 456px transparent, 528px 456px transparent,
                    552px 456px transparent, 0px 480px transparent, 24px 480px transparent,
                    48px 480px transparent, 72px 480px transparent, 96px 480px transparent,
                    120px 480px transparent, 144px 480px #535353, 168px 480px #535353,
                    192px 480px #535353, 216px 480px transparent, 240px 480px transparent,
                    264px 480px #535353, 288px 480px #535353, 312px 480px transparent,
                    336px 480px transparent, 360px 480px transparent, 384px 480px transparent,
                    408px 480px transparent, 432px 480px transparent, 456px 480px transparent,
                    480px 480px transparent, 504px 480px transparent, 528px 480px transparent,
                    552px 480px transparent, 0px 504px transparent, 24px 504px transparent,
                    48px 504px transparent, 72px 504px transparent, 96px 504px transparent,
                    120px 504px transparent, 144px 504px transparent, 168px 504px #535353,
                    192px 504px #535353, 216px 504px #535353, 240px 504px transparent,
                    264px 504px transparent, 288px 504px #535353, 312px 504px transparent,
                    336px 504px transparent, 360px 504px transparent, 384px 504px transparent,
                    408px 504px transparent, 432px 504px transparent, 456px 504px transparent,
                    480px 504px transparent, 504px 504px transparent, 528px 504px transparent,
                    552px 504px transparent, 0px 528px transparent, 24px 528px transparent,
                    48px 528px transparent, 72px 528px transparent, 96px 528px transparent,
                    120px 528px transparent, 144px 528px transparent, 168px 528px transparent,
                    192px 528px transparent, 216px 528px transparent, 240px 528px transparent,
                    264px 528px transparent, 288px 528px #535353, 312px 528px transparent,
                    336px 528px transparent, 360px 528px transparent, 384px 528px transparent,
                    408px 528px transparent, 432px 528px transparent, 456px 528px transparent,
                    480px 528px transparent, 504px 528px transparent, 528px 528px transparent,
                    552px 528px transparent, 0px 552px transparent, 24px 552px transparent,
                    48px 552px transparent, 72px 552px transparent, 96px 552px transparent,
                    120px 552px transparent, 144px 552px transparent, 168px 552px transparent,
                    192px 552px transparent, 216px 552px transparent, 240px 552px transparent,
                    264px 552px transparent, 288px 552px #535353, 312px 552px #535353,
                    336px 552px transparent, 360px 552px transparent, 384px 552px transparent,
                    408px 552px transparent, 432px 552px transparent, 456px 552px transparent,
                    480px 552px transparent, 504px 552px transparent, 528px 552px transparent,
                    552px 552px transparent;
                }
              }
            `}</style>
            <aside className="loader" style={{ "--wh-number": 24 }}>
              <div className="pixel"></div>
            </aside>
            <div style={{ marginTop: '90px', color: 'var(--theme-text-variant, #888)', fontSize: '15px', fontWeight: '500' }}>
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
