// The entry point: finds <div id="root"> in index.html and draws the app inside it.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Register the service worker (the offline helper). Only in the built app:
// during development it would keep serving old files and get in the way.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // If it fails, the app still works; it just won't work offline.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  // StrictMode adds extra checks during development to catch bugs early.
  <StrictMode>
    <App />
  </StrictMode>,
);
