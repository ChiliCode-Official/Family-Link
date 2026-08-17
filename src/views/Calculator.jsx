import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Calculator() {
  const navigate = useNavigate();
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleInput = (val) => {
    if (display === 'Error') {
      setDisplay(val === '.' ? '0.' : val);
      return;
    }

    const isOperator = (char) => ['+', '-', '*', '/', '%'].includes(char);
    const lastChar = display[display.length - 1];

    if (val === '.') {
      const parts = display.split(/[\+\-\*\/]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('.')) return;
    }

    if (isOperator(val)) {
      if (isOperator(lastChar)) {
        setDisplay(display.slice(0, -1) + val);
      } else {
        setDisplay(display + val);
      }
    } else {
      if (display === '0') {
        if (val === '.') {
          setDisplay('0.');
        } else {
          setDisplay(val);
        }
      } else {
        setDisplay(display + val);
      }
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
      let expr = display.replace(/x/g, '*');
      
      // Clean up any trailing operators at the end of the expression
      while (['+', '-', '*', '/', '%'].includes(expr.trim().slice(-1))) {
        expr = expr.trim().slice(0, -1);
      }

      if (!expr) {
        setDisplay('0');
        return;
      }

      // 1. Match addition/subtraction of percentage (e.g. 50+10% => 50+(50*10/100))
      let sanitized = expr.replace(/(\d+(?:\.\d+)?)\s*([\+\-])\s*(\d+(?:\.\d+)?)\s*%/g, "$1$2($1*$3/100)");
      
      // 2. Match multiplication/division of percentage (e.g. 100*10% => 100*(10/100))
      sanitized = sanitized.replace(/(\d+(?:\.\d+)?)\s*([\*\/])\s*(\d+(?:\.\d+)?)\s*%/g, "$1$2($3/100)");
      
      // 3. Match any remaining standalone percentage (e.g. 10% => (10/100))
      sanitized = sanitized.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");

      const result = new Function(`return ${sanitized}`)();
      if (result === undefined || isNaN(result) || !isFinite(result)) {
        throw new Error();
      }
      setEquation(display + ' =');
      setDisplay(String(Number(result.toFixed(8))));
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
