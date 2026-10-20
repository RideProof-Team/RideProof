// ---------------------------------------------------------------------------
// router.ts — decides which screen to show, based on the web address.
//
// We use the part of the address after "#", e.g. ".../#/appointments/new".
// Changing the "#" part doesn't reload the page, the phone's Back button
// works automatically, and it works offline. That's all a small app needs,
// so we don't pull in a big routing library.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';

/**
 * Every screen in the app. Some screens need extra information, like
 * which appointment to edit, so a Route is an object, not just a name.
 */
export type Route =
  | { name: 'home' }
  | { name: 'appointments' }
  | { name: 'appointment-new' }
  | { name: 'appointment-edit'; id: string }
  /** No appointmentId/date = "today's ride". */
  | { name: 'checkin'; appointmentId?: string; date?: string }
  | { name: 'history' }
  | { name: 'report' }
  | { name: 'complaint' }
  | { name: 'help' }
  | { name: 'settings' }
  | { name: 'profile-edit' };

/** Simple screens whose address is just their name, e.g. "#/history". */
const SIMPLE_ROUTES = ['home', 'appointments', 'history', 'report', 'complaint', 'help', 'settings'] as const;

/** Turn the text after "#" into a Route. Unknown addresses go Home. */
export function parseRoute(hash: string): Route {
  // "#/appointments/abc" -> ["appointments", "abc"]
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second, third] = parts;

  if (first === 'appointments') {
    if (second === 'new') return { name: 'appointment-new' };
    if (second) return { name: 'appointment-edit', id: decodeURIComponent(second) };
    return { name: 'appointments' };
  }
  if (first === 'checkin') {
    // "#/checkin/<appointment id>/<date>" checks in on one specific trip.
    if (second && third) return { name: 'checkin', appointmentId: decodeURIComponent(second), date: third };
    return { name: 'checkin' };
  }
  if (first === 'settings' && second === 'profile') return { name: 'profile-edit' };
  const simple = SIMPLE_ROUTES.find((name) => name === first);
  if (simple) return { name: simple };
  return { name: 'home' };
}

/** The opposite of parseRoute: turn a Route into "#/..." text. */
export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'appointment-new':
      return '#/appointments/new';
    case 'appointment-edit':
      return `#/appointments/${encodeURIComponent(route.id)}`;
    case 'checkin':
      return route.appointmentId && route.date
        ? `#/checkin/${encodeURIComponent(route.appointmentId)}/${route.date}`
        : '#/checkin';
    case 'profile-edit':
      return '#/settings/profile';
    default:
      // home, appointments, history, report, complaint, help, settings
      return `#/${route.name}`;
  }
}

/** Go to a screen. */
export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

/**
 * A React "hook" that returns the current route and re-renders the app
 * whenever it changes (when navigate() is called or Back is pressed).
 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    // The function returned here runs when the component goes away,
    // so we stop listening and don't leak memory.
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
