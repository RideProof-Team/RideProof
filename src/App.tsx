// ---------------------------------------------------------------------------
// App.tsx — the top of the app. It:
//   1. Remembers whether we're in real or demo mode.
//   2. Picks the matching Storage (real database or demo database).
//   3. Loads the profile from that storage (filling in the demo story the
//      first time demo mode is used).
//   4. Shows Welcome (no profile yet) or the current screen.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppContext, type AppContextValue, type ToastMessage } from './AppContext';
import { BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { Screen } from './components/Screen';
import { Toast } from './components/Toast';
import { getToday } from './lib/clock';
import { seedDemoIfEmpty } from './lib/demoData';
import { loadDemoFlag, saveDemoFlag } from './lib/demoFlag';
import { navigate, routeToHash, useRoute } from './lib/router';
import { createStorage, type DataMode } from './lib/storage';
import { AppointmentForm } from './screens/AppointmentForm';
import { Appointments } from './screens/Appointments';
import { CheckIn } from './screens/CheckIn';
import { Complaint } from './screens/Complaint';
import { Help } from './screens/Help';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Report } from './screens/Report';
import { Settings } from './screens/Settings';
import { Welcome } from './screens/Welcome';
import type { Profile } from './types';

export function App() {
  const [mode, setMode] = useState<DataMode>(() => (loadDemoFlag() ? 'demo' : 'real'));
  // useMemo makes a new Storage object only when the mode changes.
  const storage = useMemo(() => createStorage(mode), [mode]);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  // Goes up by one whenever all data should be reloaded (e.g. "Reset demo").
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const route = useRoute();
  const today = getToday(mode);
  // A short text version of the screen we're on, e.g. "demo#/home-0".
  // When it changes, the screen is redrawn from scratch (and reloads its data).
  const screenKey = `${mode}${routeToHash(route)}${profile ? '' : '-setup'}-${dataVersion}`;

  // Whenever the mode changes (or data is reset), load that mode's profile.
  useEffect(() => {
    // If the user switches modes again before loading finishes, `cancelled`
    // stops the old (wrong-mode) result from being shown.
    let cancelled = false;
    setLoading(true);
    setProfile(undefined);
    // In demo mode, make sure the demo story exists first.
    const ready = storage.mode === 'demo' ? seedDemoIfEmpty(storage) : Promise.resolve();
    ready
      .then(() => storage.getProfile())
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storage, dataVersion]);

  function toggleDemo() {
    const next: DataMode = mode === 'demo' ? 'real' : 'demo';
    saveDemoFlag(next === 'demo');
    setToast(null);
    setMode(next);
    // Start on Home in the new mode (or Welcome, if there's no profile there).
    navigate({ name: 'home' });
  }

  const refreshAll = useCallback(() => setDataVersion((v) => v + 1), []);
  // useCallback keeps this the same function between redraws, so the
  // toast's 8-second timer doesn't restart every time the app redraws.
  const closeToast = useCallback(() => setToast(null), []);

  const contextValue: AppContextValue = {
    mode,
    storage,
    profile,
    today,
    setProfile,
    toggleDemo,
    refreshAll,
    showToast: setToast,
  };

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
      case 'report':
        screen = <Report />;
        break;
      case 'complaint':
        screen = <Complaint periodId={route.periodId} />;
        break;
      case 'help':
        screen = <Help />;
        break;
      case 'settings':
        screen = <Settings />;
        break;
      case 'profile-edit':
        screen = <Welcome editing />;
        break;
    }
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Header />
      {toast && <Toast message={toast} onClose={closeToast} />}
      {/* The key makes React replay the fade-in each time the screen changes. */}
      <div className="screen-transition" key={screenKey}>
        {screen}
      </div>
      {/* The bottom menu only makes sense once setup is done. */}
      {profile && !loading && <BottomNav current={route} />}
    </AppContext.Provider>
  );
}
