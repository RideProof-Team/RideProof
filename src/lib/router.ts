// ---------------------------------------------------------------------------
// router.ts — decides which screen to show, based on the web address.
//
// We use the part of the address after "#", e.g. ".../#/history".
// Changing the "#" part doesn't reload the page, the phone's Back button
// works automatically, and it works offline. That's all a small app needs,
// so we don't pull in a big routing library.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';

/** Every screen in the app. More are added in later phases. */
export type Route = 'home';

const ROUTES: Route[] = ['home'];
const DEFAULT_ROUTE: Route = 'home';

/** Read the current route from the address bar. */
function readRoute(): Route {
  const name = window.location.hash.replace(/^#\/?/, '');
  return (ROUTES as string[]).includes(name) ? (name as Route) : DEFAULT_ROUTE;
}

/** Go to a screen. */
export function navigate(route: Route): void {
  window.location.hash = `/${route}`;
}

/**
 * A React "hook" that returns the current route and re-renders the app
 * whenever it changes (when navigate() is called or Back is pressed).
 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onChange);
    // The function returned here runs when the component goes away,
    // so we stop listening and don't leak memory.
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
