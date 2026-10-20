// The entry point: finds <div id="root"> in index.html and draws the app inside it.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  // StrictMode adds extra checks during development to catch bugs early.
  <StrictMode>
    <App />
  </StrictMode>,
);
