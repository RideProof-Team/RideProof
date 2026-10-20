/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite is the tool that runs our dev server and bundles the app for production.
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom gives tests a pretend browser (window, localStorage, etc.).
    environment: 'jsdom',
    // fake-indexeddb gives tests a pretend IndexedDB database.
    setupFiles: ['fake-indexeddb/auto'],
  },
});
