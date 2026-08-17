import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Calculator() {
  const navigate = useNavigate();
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleInput = (val) => {
    if (display === '0' && !isNaN(val)) {
      setDisplay(val);
    } else {
      setDisplay(display + val);
    }
  };

  const handleClearAll = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleCalculate = () => {
    try {
      // Safe evaluation of simple math expression
      const sanitized = display.replace(/x/g, '*').replace(/[^0-9+\-*/.%]/g, '');
      const result = new Function(`return ${sanitized}`)();
      setEquation(display + ' =');
      setDisplay(String(result));
    } catch (e) {
      setDisplay('Error');
    }
  };

  const buttons = [
    'AC', '⌫', '%', '/',
    '7', '8', '9', '*',
    '4', '5', '6', '-',
    '1', '2', '3', '+',
    '0', '.', '='
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--theme-bg, var(--md-sys-color-background))' }}>
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--theme-surface, var(--md-sys-color-surface))' }}>
        <button className="md-btn md-btn-tonal" style={{ padding: '0 12px' }} onClick={() => navigate('/')}>←</button>
        <h1 style={{ margin: 0, fontSize: '22px', color: 'var(--theme-text, var(--md-sys-color-on-surface))' }}>Calculadora</h1>
      </header>

      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '24px' }}>
        
        {/* Display */}
        <div style={{ textAlign: 'right', padding: '24px', backgroundColor: 'var(--theme-surface-variant, var(--md-sys-color-surface-variant))', borderRadius: '16px' }}>
          <div style={{ color: 'var(--theme-text-variant, var(--md-sys-color-on-surface-variant))', fontSize: '18px', minHeight: '24px' }}>{equation}</div>
          <div style={{ color: 'var(--theme-text, var(--md-sys-color-on-surface))', fontSize: '48px', fontWeight: 'bold', wordBreak: 'break-all' }}>{display}</div>
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {buttons.map(btn => (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'AC') handleClearAll();
                else if (btn === '⌫') handleBackspace();
                else if (btn === '=') handleCalculate();
                else handleInput(btn);
              }}
              style={{
                padding: '24px 0',
                fontSize: '24px',
                borderRadius: '50%',
                border: 'none',
                gridColumn: btn === '0' ? 'span 2' : 'span 1',
                borderRadius: btn === '0' ? '40px' : '50%',
                backgroundColor: ['/', '*', '-', '+', '='].includes(btn) 
                  ? 'var(--theme-accent, var(--md-sys-color-primary-container))' 
                  : ['AC', '⌫', '%'].includes(btn) ? 'var(--md-sys-color-error-container)' : 'var(--theme-btn-bg, var(--md-sys-color-secondary-container))',
                color: ['/', '*', '-', '+', '='].includes(btn) 
                  ? 'var(--theme-accent-text, var(--md-sys-color-on-primary-container))' 
                  : ['AC', '⌫', '%'].includes(btn) ? 'var(--md-sys-color-on-error-container)' : 'var(--theme-btn-text, var(--md-sys-color-on-secondary-container))',
                cursor: 'pointer'
              }}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Calculator;
