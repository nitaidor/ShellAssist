import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import './styles/themes.css'; // Master themes loaded after Tailwind

// Persist BYOK Gemini API key when entered in Settings
document.addEventListener('input', (e) => {
  if (e.target && e.target.placeholder && e.target.placeholder.includes('AIzaSy')) {
    localStorage.setItem('BYOK_GEMINI_KEY', e.target.value.trim());
  }
});

// Automatically inject stored BYOK key into Gemini API requests
const originalFetch = window.fetch.bind(window);
window.fetch = async (url, options) => {
  if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
    const savedKey = localStorage.getItem('BYOK_GEMINI_KEY') || '';
    if (url.endsWith('key=') && savedKey) {
      url = url + encodeURIComponent(savedKey);
    }
  }
  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);