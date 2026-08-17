import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/material-you.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered successfully:', reg))
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}
