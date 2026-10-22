// ---------------------------------------------------------------------------
// Screen.tsx — the wrapper every screen uses: a <main> area with a heading
// (and, on inner screens, a "Back" link above it).
//
// When a new screen appears, it moves focus to the heading and scrolls to
// the top. Without this, a screen reader user wouldn't know the screen
// changed, and keyboard focus would be left on a button that's gone.
//
// The heading is drawn right away, even while the screen is still loading
// its data, so there's always something to focus.
// ---------------------------------------------------------------------------
import { useEffect, useRef, type ReactNode } from 'react';
import { routeToHash, type Route } from '../lib/router';

interface ScreenProps {
  title: string;
  children: ReactNode;
  className?: string;
  /**
   * Inner screens (like "Edit appointment") get a "‹ Back to ..." link at
   * the top. This matters on iPhone: an app installed on the Home Screen
   * has no browser Back button.
   */
  back?: { to: Route; label: string };
}

export function Screen({ title, children, back, className = '' }: ScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The empty [] means "run once, when this screen first appears".
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  // The browser tab title, e.g. "Report – RideConnect". Screen readers
  // announce it, and it helps people with many tabs open.
  useEffect(() => {
    document.title = title === 'RideConnect' ? 'RideConnect' : `${title} – RideConnect`;
  }, [title]);

  return (
    <main className={`screen ${className}`} id="main">
      {back && (
        <a href={routeToHash(back.to)} className="back-link">
          <span aria-hidden="true">‹</span> Back to {back.label}
        </a>
      )}
      {/* tabIndex={-1} lets code focus the heading without adding it to the Tab order. */}
      <h1 tabIndex={-1} ref={headingRef}>{title}</h1>
      {children}
    </main>
  );
}
