// ---------------------------------------------------------------------------
// App.tsx — the top of the app. It:
//   1. Remembers whether we're in real or demo mode.
//   2. Picks the matching Storage (real database or demo database).
//   3. Loads the profile from that storage (filling in the demo story the
//      first time demo mode is used).
//   4. Shows Welcome (no profile yet) or the current screen.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AppContext, type AppContextValue, type ToastMessage } from './AppContext';
import { BottomNav } from './components/BottomNav';
import { FeedbackHost } from './components/FeedbackHost';
import { Header } from './components/Header';
import { DemoTour } from './components/DemoTour';
import { UpdateBanner } from './components/PwaPrompts';
import { Screen } from './components/Screen';
import { Toast } from './components/Toast';
import { getToday } from './lib/clock';
import { seedDemoIfEmpty } from './lib/demoData';
import { requestPersistentStorage } from './lib/persist';
import { loadDemoFlag, saveDemoFlag } from './lib/demoFlag';
import { confirmLeave, navigate, routeToHash, useRoute } from './lib/router';
import { createStorage, type DataMode } from './lib/storage';
import { AppointmentForm } from './screens/AppointmentForm';
import { Appointments } from './screens/Appointments';
import { CheckIn } from './screens/CheckIn';
import { Complaint } from './screens/Complaint';
import { Help } from './screens/Help';
import { History } from './screens/History';
import { Wait } from './screens/Wait';
import { WaitWatcher } from './components/WaitWatcher';
import { Home } from './screens/Home';
import { Report } from './screens/Report';
import { Settings } from './screens/Settings';
import { Welcome } from './screens/Welcome';
import { Landing, SignIn } from './screens/PublicPages';
import type { Profile } from './types';

export function App() {
  const [mode, setMode] = useState<DataMode>(() => (loadDemoFlag() ? 'demo' : 'real'));
  // useMemo makes a new Storage object only when the mode changes.
  const storage = useMemo(() => createStorage(mode), [mode]);
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Goes up by one whenever all data should be reloaded (e.g. "Reset demo").
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  const [tourAutoPlay, setTourAutoPlay] = useState(true);
  const switchingMode = useRef(false);
  const route = useRoute();
  const today = getToday(mode);
  const isPublic = route.name === 'landing' || route.name === 'signin';
  useEffect(() => {
    if ((isPublic || route.name === 'setup') && mode === 'demo') {
      saveDemoFlag(false);
      setMode('real');
      setTourOpen(false);
    }
  }, [route.name]);
  async function changeMode(next: DataMode, autoPlay = true) {
    if (switchingMode.current) return;
    switchingMode.current = true;
    try {
      if (!(await confirmLeave())) return;
      setToast(null);
      setTourOpen(next === 'demo');
      setTourAutoPlay(autoPlay);
      setTourRun(run => run + 1);
      saveDemoFlag(next === 'demo');
      setMode(next);
      navigate({ name: 'home' });
    } finally {
      switchingMode.current = false;
    }
  }
  function openDemo(autoPlay = true) {
    return changeMode('demo', autoPlay);
  }
  // A short text version of the screen we're on, e.g. "demo#/home-0".
  // When it changes, the screen is redrawn from scratch (and reloads its data).
  const screenKey = `${mode}${routeToHash(route)}${profile ? '' : '-setup'}-${dataVersion}`;

  // Whenever the mode changes (or data is reset), load that mode's profile.
  useEffect(() => {
    // If the user switches modes again before loading finishes, `cancelled`
    // stops the old (wrong-mode) result from being shown.
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setProfile(undefined);
    // In demo mode, make sure the demo story exists first.
    const ready = storage.mode === 'demo' ? seedDemoIfEmpty(storage) : Promise.resolve();
    ready
      .then(() => storage.getProfile())
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('We couldn’t open your records on this device. Check that browser storage is allowed, then try again.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storage, dataVersion]);

  // Once someone has real data, ask the browser to keep it permanently.
  useEffect(() => {
    if (mode === 'real' && profile) requestPersistentStorage();
  }, [mode, profile]);

  function toggleDemo() {
    void changeMode(mode === 'demo' ? 'real' : 'demo');
  }

  // A normal "#main" link would change the address (which is how we pick
  // screens), so instead we move focus to the main area ourselves.
  function skipToMain(event: MouseEvent) {
    event.preventDefault();
    document.querySelector<HTMLElement>('main h1')?.focus();
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
  if (route.name === 'landing') {
    screen = <Landing onDemo={openDemo} />;
  } else if (route.name === 'signin') {
    screen = <SignIn profile={mode === 'real' ? profile : undefined} loading={loading || mode !== 'real'} error={mode === 'real' ? loadError : null} onRetry={refreshAll} onContinue={() => navigate({ name: 'home' })} onDemo={() => openDemo()} />;
  } else if (loadError) {
    screen = <Screen title="Your records couldn’t be opened"><p role="alert">{loadError}</p><button className="button-primary" onClick={refreshAll}>Try again</button></Screen>;
  } else if (loading) {
    screen = <Screen title="RideConnect"><p>Loading…</p></Screen>;
  } else if (!profile) {
    screen = <Welcome />;
  } else {
    switch (route.name) {
      case 'setup':
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
      case 'wait':
        screen = <Wait key={route.id ?? 'running'} id={route.id} />;
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
      {/* Lets keyboard users jump past the header straight to the screen's content. */}
      <a href="#main" className="skip-link" onClick={skipToMain}>Skip to main content</a>
      {!isPublic && <Header onStartTour={() => openDemo()} />}
      {!isPublic && <UpdateBanner />}
      {toast && <Toast message={toast} onClose={closeToast} />}
      {tourOpen && mode === 'demo' && profile && !loading && !isPublic && <DemoTour key={tourRun} route={route} autoPlay={tourAutoPlay} onClose={() => setTourOpen(false)} />}
      {/* The key makes React draw each new screen from scratch, which also
          replays its entrance animation (see app-theme.css and motion.css). */}
      <div className="screen-transition" key={screenKey}>
        {screen}
      </div>
      {/* The bottom menu only makes sense once setup is done. */}
      {profile && !loading && !isPublic && <BottomNav current={route} />}
      <FeedbackHost />
      {profile && !loading && !isPublic && <WaitWatcher onWaitScreen={route.name === 'wait'} />}
    </AppContext.Provider>
  );
}
