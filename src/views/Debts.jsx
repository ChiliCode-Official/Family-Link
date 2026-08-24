import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { safeStorage } from '../services/storage';

function Debts() {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  
  const [newDebt, setNewDebt] = useState({ amount: '', debtor: '', customDebtor: '', description: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nickname, setNickname] = useState(safeStorage.get('familyNickname', ''));

  useEffect(() => {
    // 1. Listen to real Debts from Firestore
    const unsubDebts = onSnapshot(collection(db, 'debts'), snapshot => {
      setDebts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Listen to real registered Family Members from Firestore
    const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => {
      const usersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setRegisteredUsers(usersList);
    });

    // 3. Ensure current user is synced to Firestore users collection
    const syncCurrentUser = async () => {
      if (auth.currentUser && nickname) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists() || !userDoc.data().nickname) {
            await setDoc(userDocRef, {
              nickname: nickname,
              displayName: auth.currentUser.displayName || '',
              photoURL: auth.currentUser.photoURL || ''
            }, { merge: true });
          }
        } catch (e) {
          console.error("Error syncing user in Debts:", e);
        }
      }
    };
    syncCurrentUser();

    return () => {
      unsubDebts();
      unsubUsers();
    };
  }, [nickname]);

  const handleAddDebt = async () => {
    const finalDebtor = newDebt.debtor === '__custom__' 
      ? newDebt.customDebtor.trim() 
      : newDebt.debtor.trim();

    if (!newDebt.amount || !finalDebtor || !newDebt.description.trim()) {
      alert("Por favor completa todos los campos (monto, quién debe y concepto).");
      return;
    }

    if (!auth.currentUser || !nickname) {
      alert("Inicia sesión y configura tu apodo en el Home primero.");
      return;
    }

    await addDoc(collection(db, 'debts'), {
      amount: parseFloat(newDebt.amount),
      debtor: finalDebtor,
      description: newDebt.description.trim(),
      creditor: nickname,
      date: new Date().toISOString()
    });

    setNewDebt({ amount: '', debtor: '', customDebtor: '', description: '' });
    setIsModalOpen(false);
  };

  const handlePay = async (id) => {
    await deleteDoc(doc(db, 'debts', id));
  };

  // Filter debts by real user nickname
  const myDebts = debts.filter(d => (d.debtor || '').toLowerCase() === (nickname || '').toLowerCase());
  const owedToMe = debts.filter(d => (d.creditor || '').toLowerCase() === (nickname || '').toLowerCase());

  const totalOwedByMe = myDebts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  // Available family member names from registered users
  const availableMembers = registeredUsers
    .map(u => u.nickname || u.displayName)
    .filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--theme-bg, var(--md-sys-color-background))', width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box' }}>
      {/* Header */}
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--theme-surface, var(--md-sys-color-surface))', boxShadow: 'var(--md-sys-elevation-1)' }}>
        <button className="md-btn md-btn-tonal" style={{ padding: '0 12px' }} onClick={() => navigate('/')}>←</button>
        <h1 style={{ margin: 0, fontSize: '22px', color: 'var(--theme-text, var(--md-sys-color-on-surface))' }}>Cuentas Familiares</h1>
        <button 
          className="md-btn md-btn-primary" 
          style={{ marginLeft: 'auto', backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)' }} 
          onClick={() => {
            if (!auth.currentUser || !nickname) {
              alert("Debes iniciar sesión con Google y tener un apodo en la página principal para crear cobros.");
            } else {
              setIsModalOpen(true);
            }
          }}
        >
          + Cobrar
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="md-card md-card-elevated" style={{ backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', padding: '16px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Yo Debo</h3>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>${totalOwedByMe.toFixed(2)}</div>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>{myDebts.length} {myDebts.length === 1 ? 'cuenta pendiente' : 'cuentas pendientes'}</span>
          </div>
          <div className="md-card md-card-elevated" style={{ backgroundColor: 'var(--tag-green, #2e7d32)', color: 'var(--tag-on-green, #ffffff)', padding: '16px', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Me Deben</h3>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>${totalOwedToMe.toFixed(2)}</div>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>{owedToMe.length} {owedToMe.length === 1 ? 'por cobrar' : 'por cobrar'}</span>
          </div>
        </div>

        {/* My Debts List */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--theme-text, var(--md-sys-color-on-background))', fontWeight: '700' }}>
            💳 Cuentas por pagar
          </h2>
          {myDebts.length === 0 ? (
            <div className="md-card" style={{ padding: '16px', borderRadius: '16px', textAlign: 'center', color: 'var(--theme-text-variant, #888)', backgroundColor: 'var(--theme-surface, rgba(255,255,255,0.03))' }}>
              No tienes pagos pendientes ¡Estás al corriente! 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myDebts.map(d => (
                <div key={d.id} className="md-card md-card-elevated" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--theme-surface, #1e1e1e)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--theme-text, #ffffff)' }}>{d.description}</div>
                    <div style={{ fontSize: '13px', color: 'var(--theme-text-variant, #aaaaaa)', marginTop: '2px' }}>
                      Cobrado por: <strong style={{ color: 'var(--theme-text, #ffffff)' }}>{d.creditor}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--md-sys-color-error, #ff4b4b)' }}>${parseFloat(d.amount).toFixed(2)}</span>
                    <button className="md-btn md-btn-tonal" onClick={() => handlePay(d.id)} style={{ borderRadius: '10px' }}>
                      Pagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Owed to me List */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--theme-text, var(--md-sys-color-on-background))', fontWeight: '700' }}>
            📥 Cuentas por cobrar a otros
          </h2>
          {owedToMe.length === 0 ? (
            <div className="md-card" style={{ padding: '16px', borderRadius: '16px', textAlign: 'center', color: 'var(--theme-text-variant, #888)', backgroundColor: 'var(--theme-surface, rgba(255,255,255,0.03))' }}>
              Nadie te debe dinero actualmente.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {owedToMe.map(d => (
                <div key={d.id} className="md-card md-card-elevated" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '16px', backgroundColor: 'var(--theme-surface, #1e1e1e)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--theme-text, #ffffff)' }}>{d.description}</div>
                    <div style={{ fontSize: '13px', color: 'var(--theme-text-variant, #aaaaaa)', marginTop: '2px' }}>
                      Debe: <strong style={{ color: 'var(--theme-text, #ffffff)' }}>{d.debtor}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--tag-green, #4caf50)' }}>${parseFloat(d.amount).toFixed(2)}</span>
                    <button className="md-btn" style={{ color: 'var(--theme-accent, #006493)', fontWeight: '600' }} onClick={() => handlePay(d.id)}>
                      ✓ Saldar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add Debt Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '20px' }}>
          <div className="md-card md-card-elevated" style={{ width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '24px', backgroundColor: 'var(--theme-surface, #1e1e1e)', color: 'var(--theme-text, #ffffff)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Registrar Cobro</h2>
            
            {/* Debtor selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--theme-text-variant, #aaaaaa)' }}>👤 ¿A quién le cobras?</label>
              <select 
                value={newDebt.debtor} 
                onChange={e => setNewDebt({...newDebt, debtor: e.target.value})} 
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', outline: 'none', fontSize: '14px', cursor: 'pointer' }}
              >
                <option value="">Selecciona familiar registrado...</option>
                {availableMembers.filter(m => m.toLowerCase() !== nickname.toLowerCase()).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="__custom__">✏️ Escribir otro nombre...</option>
              </select>

              {newDebt.debtor === '__custom__' && (
                <input 
                  placeholder="Nombre de la persona (ej. Tía Laura)" 
                  value={newDebt.customDebtor} 
                  onChange={e => setNewDebt({...newDebt, customDebtor: e.target.value})}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--theme-accent, #006493)', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', outline: 'none', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }}
                />
              )}
            </div>

            {/* Amount input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--theme-text-variant, #aaaaaa)' }}>💰 Monto a cobrar ($ MXN)</label>
              <input 
                type="number" 
                placeholder="Ej. 150.00" 
                value={newDebt.amount} 
                onChange={e => setNewDebt({...newDebt, amount: e.target.value})} 
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', outline: 'none', fontSize: '15px', boxSizing: 'border-box' }} 
              />
            </div>

            {/* Concept input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--theme-text-variant, #aaaaaa)' }}>📝 Concepto / Motivo</label>
              <input 
                placeholder="Ej. Pizza, Uber, Despensa, Luz..." 
                value={newDebt.description} 
                onChange={e => setNewDebt({...newDebt, description: e.target.value})} 
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--theme-bg, #121212)', color: 'var(--theme-text, #ffffff)', outline: 'none', fontSize: '15px', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button className="md-btn md-btn-tonal" onClick={() => setIsModalOpen(false)} style={{ borderRadius: '12px' }}>
                Cancelar
              </button>
              <button className="md-btn md-btn-primary" onClick={handleAddDebt} style={{ backgroundColor: 'var(--theme-accent, #006493)', color: 'var(--theme-accent-text, white)', borderRadius: '12px' }}>
                Guardar Cobro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Debts;
