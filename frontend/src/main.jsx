// Apply theme synchronously before React renders — prevents flash of wrong theme
(function () {
  const saved = localStorage.getItem('reelvault-theme');
  const theme = (saved === 'dark' || saved === 'light')
    ? saved
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
