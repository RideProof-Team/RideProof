// ---------------------------------------------------------------------------
// Screen.tsx — the wrapper every screen uses: a <main> area with a heading.
//
// When a new screen appears, it moves focus to the heading and scrolls to
// the top. Without this, a screen reader user wouldn't know the screen
// changed, and keyboard focus would be left on a button that's gone.
//
// The heading is drawn right away, even while the screen is still loading
// its data, so there's always something to focus.
// ---------------------------------------------------------------------------
import { useEffect, useRef, type ReactNode } from 'react';

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The empty [] means "run once, when this screen first appears".
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  // The browser tab title, e.g. "Report – RideProof". Screen readers
  // announce it, and it helps people with many tabs open.
  useEffect(() => {
    document.title = title === 'RideProof' ? 'RideProof' : `${title} – RideProof`;
  }, [title]);

  return (
    <main className="screen" id="main">
      {/* tabIndex={-1} lets code focus the heading without adding it to the Tab order. */}
      <h1 tabIndex={-1} ref={headingRef}>{title}</h1>
      {children}
    </main>
  );
}
