// ---------------------------------------------------------------------------
// Header.tsx — the bar across the top of every screen.
// Left: the app name. Right: the "Demo" / "Exit demo" button.
// When demo mode is on, a thin banner appears underneath.
// (Phase 7 makes the banner open the "Demo controls" panel.)
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';

export function Header() {
  const { mode, toggleDemo } = useApp();
  const isDemo = mode === 'demo';

  return (
    // <header> is a "landmark": screen readers let users jump straight to it.
    <header className="app-header">
      <div className="header-bar">
        <span className="app-name">RideProof</span>
        <button
          type="button"
          className="demo-button"
          onClick={toggleDemo}
          // aria-pressed tells screen readers this is an on/off switch.
          aria-pressed={isDemo}
        >
          {isDemo ? 'Exit demo' : 'Demo'}
        </button>
      </div>
      {isDemo && (
        // role="status" makes screen readers announce it when it appears.
        <div className="demo-banner" role="status">
          Demo mode — sample data.
        </div>
      )}
    </header>
  );
}
