import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Calculator() {
  const navigate = useNavigate();
  const [display, setDisplay] = useState('0');
  const [tokens, setTokens] = useState([]);
  const [isReset, setIsReset] = useState(false);
  const [lastOperator, setLastOperator] = useState(null);

  const evaluateTokens = (tokensList) => {
    let list = [...tokensList];
    
    // First pass: multiplication and division
    for (let i = 0; i < list.length; i++) {
      if (list[i] === '*' || list[i] === '/') {
        const op = list[i];
        const prev = parseFloat(list[i - 1]);
        const next = parseFloat(list[i + 1]);
        let res = 0;
        if (op === '*') res = prev * next;
        else res = next === 0 ? Infinity : prev / next;
        
        list.splice(i - 1, 3, res);
        i--;
      }
    }
    
    // Second pass: addition and subtraction
    let result = parseFloat(list[0]);
    for (let i = 1; i < list.length; i += 2) {
      const op = list[i];
      const next = parseFloat(list[i + 1]);
      if (op === '+') result += next;
      if (op === '-') result -= next;
    }
    
    return result;
  };

  const handleDigit = (digit) => {
    setLastOperator(null);
    if (display === '0' || display === 'Error' || isReset) {
      setDisplay(digit === '.' ? '0.' : digit);
      setIsReset(false);
    } else {
      if (digit === '.' && display.includes('.')) return;
      setDisplay(display + digit);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setTokens([]);
    setIsReset(false);
    setLastOperator(null);
  };

  const handleToggleSign = () => {
    setDisplay(String(parseFloat(display) * -1));
  };

  const handlePercent = () => {
    const val = parseFloat(display);
    let pctVal;
    if (tokens.length > 0) {
      const lastVal = tokens[tokens.length - 2];
      const lastOp = tokens[tokens.length - 1];
      if (lastOp === '+' || lastOp === '-') {
        pctVal = lastVal * (val / 100);
      } else {
        pctVal = val / 100;
      }
    } else {
      pctVal = val / 100;
    }
    setDisplay(String(Number(pctVal.toFixed(8))));
  };

  const handleOperator = (op) => {
    const val = parseFloat(display);
    let newTokens = [...tokens, val];

    // Highlight the clicked operator in Apple style
    setLastOperator(op);

    if (tokens.length > 0) {
      const lastOp = tokens[tokens.length - 1];
      // If we clicked +, -, *, or /, and they just changed their mind:
      if (isReset) {
        const updatedTokens = [...tokens];
        updatedTokens[updatedTokens.length - 1] = op;
        setTokens(updatedTokens);
        return;
      }
    }

    if (op === '+' || op === '-') {
      // Evaluate everything up to now
      const result = evaluateTokens(newTokens);
      setDisplay(String(Number(result.toFixed(8))));
      setTokens([result, op]);
    } else {
      // For * and /, check if the previous operator was also high-precedence
      const lastOp = tokens[tokens.length - 1];
      if (lastOp === '*' || lastOp === '/') {
        const result = evaluateTokens(newTokens);
        setDisplay(String(Number(result.toFixed(8))));
        setTokens([result, op]);
      } else {
        setTokens([...tokens, val, op]);
      }
    }
    setIsReset(true);
  };

  const handleCalculate = () => {
    if (tokens.length === 0) return;
    const val = parseFloat(display);
    const finalTokens = [...tokens, val];
    try {
      const result = evaluateTokens(finalTokens);
      if (result === undefined || isNaN(result) || !isFinite(result)) {
        throw new Error();
      }
      setDisplay(String(Number(result.toFixed(8))));
      setTokens([]);
      setIsReset(true);
      setLastOperator(null);
    } catch (e) {
      setDisplay('Error');
      setTokens([]);
      setIsReset(true);
      setLastOperator(null);
    }
  };

  const buttons = [
    { label: 'C', type: 'action' },
    { label: '+/-', type: 'action' },
    { label: '%', type: 'action' },
    { label: '÷', type: 'operator', op: '/' },
    { label: '7', type: 'digit' },
    { label: '8', type: 'digit' },
    { label: '9', type: 'digit' },
    { label: '×', type: 'operator', op: '*' },
    { label: '4', type: 'digit' },
    { label: '5', type: 'digit' },
    { label: '6', type: 'digit' },
    { label: '–', type: 'operator', op: '-' },
    { label: '1', type: 'digit' },
    { label: '2', type: 'digit' },
    { label: '3', type: 'digit' },
    { label: '+', type: 'operator', op: '+' },
    { label: '0', type: 'digit', double: true },
    { label: '.', type: 'digit' },
    { label: '=', type: 'operator', op: '=' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#000000', color: '#ffffff' }}>
      <header style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#1c1c1e' }}>
        <button className="back-btn" style={{ padding: '0', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#ffffff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#ffffff' }}>Calculadora</h1>
      </header>

      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '20px', maxWidth: '400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* Display */}
        <div style={{ textAlign: 'right', padding: '10px 20px', minHeight: '80px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ color: '#ffffff', fontSize: '64px', fontWeight: '300', wordBreak: 'break-all', letterSpacing: '-1px' }}>{display}</div>
        </div>

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {buttons.map(btn => {
            const isDigit = btn.type === 'digit';
            const isAction = btn.type === 'action';
            const isOperator = btn.type === 'operator';
            const isActiveOp = isOperator && lastOperator === btn.op;

            let bg = '#333333';
            let color = '#ffffff';
            if (isAction) {
              bg = '#a5a5a5';
              color = '#000000';
            } else if (isOperator) {
              bg = isActiveOp ? '#ffffff' : '#ff9f0a';
              color = isActiveOp ? '#ff9f0a' : '#ffffff';
            }

            return (
              <button
                key={btn.label}
                onClick={() => {
                  if (btn.label === 'C') handleClear();
                  else if (btn.label === '+/-') handleToggleSign();
                  else if (btn.label === '%') handlePercent();
                  else if (btn.label === '=') handleCalculate();
                  else if (isOperator) handleOperator(btn.op);
                  else handleDigit(btn.label);
                }}
                style={{
                  gridColumn: btn.double ? 'span 2' : 'span 1',
                  height: '75px',
                  fontSize: '28px',
                  fontWeight: '500',
                  borderRadius: btn.double ? '40px' : '50%',
                  border: 'none',
                  backgroundColor: bg,
                  color: color,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: btn.double ? 'flex-start' : 'center',
                  paddingLeft: btn.double ? '28px' : '0',
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Calculator;
