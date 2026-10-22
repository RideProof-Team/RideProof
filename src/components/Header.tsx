// ---------------------------------------------------------------------------
// Header.tsx — the bar across the top of every screen.
// Left: the app name. Right: the "Demo" / "Exit demo" button.
// When demo mode is on, a thin banner appears underneath. Tapping the
// banner opens the "Demo controls" panel.
// ---------------------------------------------------------------------------
import { useRef } from 'react';
import { useApp } from '../AppContext';
import { DemoControls } from './DemoControls';
import { Brand } from './Brand';
import { LanguageButton } from './LanguageSwitch';
import { t } from '../lib/i18n';

export function Header({ onStartTour }: { onStartTour(): void }) {
  const { mode, toggleDemo } = useApp();
  const isDemo = mode === 'demo';
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    // <header> is a "landmark": screen readers let users jump straight to it.
    <header className="app-header">
      <div className="header-bar">
        <Brand />
        <a href="#/signin" className="device-access-link">{t('Device access')}</a>
        <LanguageButton />
        {isDemo && <button type="button" className="demo-button" onClick={onStartTour}>{t('Restart tour')}</button>}
        <button
          type="button"
          className="demo-button"
          onClick={toggleDemo}
          // aria-pressed tells screen readers this is an on/off switch.
          aria-pressed={isDemo}
        >
          {isDemo ? t('Exit demo') : t('Demo')}
        </button>
      </div>
      {isDemo && (
        <>
          <button
            type="button"
            className="demo-banner"
            // showModal() opens the <dialog> on top of everything, and the
            // browser keeps keyboard focus inside it until it's closed.
            onClick={() => dialogRef.current?.showModal()}
            aria-haspopup="dialog"
          >
            {t('Demo mode — sample data.')} <span className="demo-banner-hint">{t('Controls ▾')}</span>
          </button>
          <DemoControls dialogRef={dialogRef} />
        </>
      )}
    </header>
  );
}
