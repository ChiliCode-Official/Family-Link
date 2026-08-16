import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const FAMILY_MEMBERS = ['Mamá', 'Papá', 'Hermano', 'Rodrigo', 'Hannah'];

function Debts() {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  
  const [newDebt, setNewDebt] = useState({ amount: '', debtor: '', description: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nickname, setNickname] = useState(localStorage.getItem('familyNickname') || '');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'debts'), snapshot => {
      setDebts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAddDebt = async () => {
    if (!newDebt.amount || !newDebt.debtor || !newDebt.description) return;
    if (!auth.currentUser || !nickname) {
      alert("Inicia sesión y configura tu apodo en el Home primero.");
      return;
    }

    await addDoc(collection(db, 'debts'), {
      amount: parseFloat(newDebt.amount),
      debtor: newDebt.debtor,
      description: newDebt.description,
      creditor: nickname,
      date: new Date().toISOString()
    });

    setNewDebt({ amount: '', debtor: '', description: '' });
    setIsModalOpen(false);
  };

  const handlePay = async (id) => {
    await deleteDoc(doc(db, 'debts', id));
  };

  const myDebts = debts.filter(d => d.debtor === nickname);
  const owedToMe = debts.filter(d => d.creditor === nickname);

  const totalOwedByMe = myDebts.reduce((sum, d) => sum + d.amount, 0);
  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--md-sys-color-background)' }}>
      {/* Header */}
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--md-sys-color-surface)', boxShadow: 'var(--md-sys-elevation-1)' }}>
        <button className="md-btn md-btn-tonal" style={{ padding: '0 12px' }} onClick={() => navigate('/')}>←</button>
        <h1 style={{ margin: 0, fontSize: '22px' }}>Cuentas Familiares</h1>
        <button className="md-btn md-btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setIsModalOpen(true)}>
          + Cobrar
        </button>
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="md-card md-card-elevated" style={{ backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>Yo Debo</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${totalOwedByMe.toFixed(2)}</div>
          </div>
          <div className="md-card md-card-elevated" style={{ backgroundColor: 'var(--tag-green)', color: 'var(--tag-on-green)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>Me Deben</h3>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${totalOwedToMe.toFixed(2)}</div>
          </div>
        </div>

        {/* My Debts List */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--md-sys-color-on-background)' }}>Cuentas por pagar</h2>
          {myDebts.length === 0 ? (
            <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>No debes nada ¡Genial!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myDebts.map(d => (
                <div key={d.id} className="md-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{d.description}</div>
                    <div style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>a {d.creditor}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--md-sys-color-error)' }}>${d.amount}</span>
                    <button className="md-btn md-btn-tonal" onClick={() => handlePay(d.id)}>Pagar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Owed to me List */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--md-sys-color-on-background)' }}>Cuentas por cobrar</h2>
          {owedToMe.length === 0 ? (
            <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Nadie te debe nada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {owedToMe.map(d => (
                <div key={d.id} className="md-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{d.description}</div>
                    <div style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>de {d.debtor}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--tag-on-green)' }}>${d.amount}</span>
                    <button className="md-btn" style={{ color: 'var(--md-sys-color-primary)' }} onClick={() => handlePay(d.id)}>✓ Saldado</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add Debt Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="md-card md-card-elevated" style={{ width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0 }}>Crear Cobro</h2>
            
            <div>
              <label style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>¿Quién debe?</label>
              <select value={newDebt.debtor} onChange={e => setNewDebt({...newDebt, debtor: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)', marginTop: '4px' }}>
                <option value="">Selecciona familiar...</option>
                {FAMILY_MEMBERS.filter(m => m !== nickname).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>Monto ($)</label>
              <input type="number" placeholder="Ej. 150" value={newDebt.amount} onChange={e => setNewDebt({...newDebt, amount: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)', marginTop: '4px' }} />
            </div>

            <div>
              <label style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>Concepto</label>
              <input placeholder="Ej. Pizza, Uber..." value={newDebt.description} onChange={e => setNewDebt({...newDebt, description: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--md-sys-color-outline)', marginTop: '4px' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button className="md-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="md-btn md-btn-primary" onClick={handleAddDebt}>Cobrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Debts;
