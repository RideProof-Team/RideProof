/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Every file in the public/ folder (icons, manifest), as web paths. */
function publicFiles(dir = 'public'): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? publicFiles(path) : [relative('public', path).split('\\').join('/')];
  });
}

/**
 * A tiny plugin we wrote ourselves: after Vite bundles the app, it writes
 * sw.js (the service worker) with the exact list of files to save for
 * offline use. Vite gives files names like "index-B7PFdBUG.js" that change
 * every build, so the list can't be typed by hand.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'rideconnect-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', './index.html', ...Object.keys(bundle).map((f) => `./${f}`), ...publicFiles().map((f) => `./${f}`)];
      // The version changes whenever any file name changes, so phones
      // download the new version of the app after an update.
      const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync('src/sw-template.js', 'utf8')
        .replace('self.__PRECACHE_FILES__', JSON.stringify([...new Set(files)]))
        .replace('self.__CACHE_VERSION__', JSON.stringify(version));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Vite is the tool that runs our dev server and bundles the app for production.
export default defineConfig({
  // './' makes every file path relative, so the built app works from any
  // folder, e.g. https://example.github.io/RideConnect/.
  base: './',
  plugins: [react(), serviceWorkerPlugin()],
  test: {
    // jsdom gives tests a pretend browser (window, localStorage, etc.).
    environment: 'jsdom',
    // fake-indexeddb gives tests a pretend IndexedDB database.
    setupFiles: ['fake-indexeddb/auto'],
  },
});
