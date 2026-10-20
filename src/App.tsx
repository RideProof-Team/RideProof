// ---------------------------------------------------------------------------
// App.tsx — the top of the app. It:
//   1. Remembers whether we're in real or demo mode.
//   2. Picks the matching Storage (real database or demo database).
//   3. Loads the profile from that storage.
//   4. Shows Welcome (no profile yet) or the current screen.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import { AppContext, type AppContextValue } from './AppContext';
import { Header } from './components/Header';
import { loadDemoFlag, saveDemoFlag } from './lib/demoFlag';
import { useRoute } from './lib/router';
import { createStorage, type DataMode } from './lib/storage';
import { Home } from './screens/Home';
import { Welcome } from './screens/Welcome';
import type { Profile } from './types';

export function App() {
  const [mode, setMode] = useState<DataMode>(() => (loadDemoFlag() ? 'demo' : 'real'));
  // useMemo makes a new Storage object only when the mode changes.
  const storage = useMemo(() => createStorage(mode), [mode]);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const route = useRoute();

  // Whenever the mode changes, load that mode's profile.
  useEffect(() => {
    // If the user switches modes again before loading finishes, `cancelled`
    // stops the old (wrong-mode) result from being shown.
    let cancelled = false;
    setLoading(true);
    setProfile(undefined);
    storage.getProfile().then((loaded) => {
      if (cancelled) return;
      setProfile(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  function toggleDemo() {
    const next: DataMode = mode === 'demo' ? 'real' : 'demo';
    saveDemoFlag(next === 'demo');
    setMode(next);
  }

  const contextValue: AppContextValue = { mode, storage, profile, setProfile, toggleDemo };

  // Pick the screen to show.
  let screen;
  if (loading) {
    screen = <main className="screen"><p>Loading…</p></main>;
  } else if (!profile) {
    screen = <Welcome />;
  } else {
    switch (route) {
      case 'home':
        screen = <Home />;
        break;
    }
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Header />
      {/* The key makes React replay the fade-in each time the screen changes. */}
      <div className="screen-transition" key={`${mode}-${route}-${profile ? 'ready' : 'setup'}`}>
        {screen}
      </div>
    </AppContext.Provider>
  );
}
