// ---------------------------------------------------------------------------
// App.tsx — the top of the app. It:
//   1. Remembers whether we're in real or demo mode.
//   2. Picks the matching Storage (real database or demo database).
//   3. Loads the profile from that storage.
//   4. Shows Welcome (no profile yet) or the current screen.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import { AppContext, type AppContextValue } from './AppContext';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { Screen } from './components/Screen';
import { getToday } from './lib/clock';
import { loadDemoFlag, saveDemoFlag } from './lib/demoFlag';
import { routeToHash, useRoute } from './lib/router';
import { createStorage, type DataMode } from './lib/storage';
import { AppointmentForm } from './screens/AppointmentForm';
import { Appointments } from './screens/Appointments';
import { CheckIn } from './screens/CheckIn';
import { History } from './screens/History';
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
  const today = getToday(mode);
  // A short text version of the screen we're on, e.g. "demo#/home".
  const screenKey = `${mode}${routeToHash(route)}${profile ? '' : '-setup'}`;

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

  const contextValue: AppContextValue = { mode, storage, profile, today, setProfile, toggleDemo };

  // Pick the screen to show.
  let screen;
  if (loading) {
    screen = <Screen title="RideProof"><p>Loading…</p></Screen>;
  } else if (!profile) {
    screen = <Welcome />;
  } else {
    switch (route.name) {
      case 'home':
        screen = <Home />;
        break;
      case 'appointments':
        screen = <Appointments />;
        break;
      case 'appointment-new':
        screen = <AppointmentForm />;
        break;
      case 'appointment-edit':
        // The key makes React start fresh if we go from editing one appointment to another.
        screen = <AppointmentForm key={route.id} id={route.id} />;
        break;
      case 'checkin':
        screen = <CheckIn appointmentId={route.appointmentId} date={route.date} />;
        break;
      case 'history':
        screen = <History />;
        break;
      default:
        // Screens that aren't built yet fall back to Home.
        screen = <Home />;
    }
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Header />
      {/* The key makes React replay the fade-in each time the screen changes. */}
      <div className="screen-transition" key={screenKey}>
        {screen}
      </div>
      {/* The bottom menu only makes sense once setup is done. */}
      {profile && !loading && <BottomNav current={route} />}
    </AppContext.Provider>
  );
}
