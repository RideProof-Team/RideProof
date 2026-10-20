// The entry point: finds <div id="root"> in index.html and draws the app inside it.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

import { startPwa } from './lib/pwa';

// Set up offline support, updates, and the install button (see lib/pwa.ts).
// The offline helper only runs in the built app: during development it
// would keep serving old files and get in the way.
startPwa();

createRoot(document.getElementById('root')!).render(
  // StrictMode adds extra checks during development to catch bugs early.
  <StrictMode>
    <App />
  </StrictMode>,
);
