// ---------------------------------------------------------------------------
// router.ts — decides which screen to show, based on the web address.
//
// We use the part of the address after "#", e.g. ".../#/appointments/new".
// Changing the "#" part doesn't reload the page, the phone's Back button
// works automatically, and it works offline. That's all a small app needs,
// so we don't pull in a big routing library.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { askConfirm, type ConfirmOptions } from './feedback';

/**
 * Every screen in the app. Some screens need extra information, like
 * which appointment to edit, so a Route is an object, not just a name.
 */
export type Route =
  | { name: 'landing' }
  | { name: 'signin' }
  | { name: 'setup' }
  | { name: 'home' }
  | { name: 'appointments' }
  | { name: 'appointment-new' }
  | { name: 'appointment-edit'; id: string }
  /** No appointmentId/date = "today's ride". */
  | { name: 'checkin'; appointmentId?: string; date?: string }
  | { name: 'history' }
  /** The "Where's my ride?" waiting screen. No id = the timer that's running. */
  | { name: 'wait'; id?: string }
  | { name: 'report' }
  /** periodId: which report period the letter covers (default: past month). */
  | { name: 'complaint'; periodId?: string }
  | { name: 'help' }
  | { name: 'settings' }
  | { name: 'profile-edit' };

/** Simple screens whose address is just their name, e.g. "#/history". */
const SIMPLE_ROUTES = ['landing', 'signin', 'setup', 'home', 'appointments', 'history', 'report', 'help', 'settings'] as const;

/** Turn the text after "#" into a Route. Unknown addresses go Home. */
export function parseRoute(hash: string): Route {
  // "#/appointments/abc" -> ["appointments", "abc"]
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [first, second, third] = parts;
  if (!first) return { name: 'landing' };

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
  if (first === 'wait') return second ? { name: 'wait', id: decodeURIComponent(second) } : { name: 'wait' };
  if (first === 'complaint') return second ? { name: 'complaint', periodId: second } : { name: 'complaint' };
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
    case 'wait':
      return route.id ? `#/wait/${encodeURIComponent(route.id)}` : '#/wait';
    case 'complaint':
      return route.periodId ? `#/complaint/${route.periodId}` : '#/complaint';
    case 'profile-edit':
      return '#/settings/profile';
    default:
      // home, appointments, history, report, help, settings
      return `#/${route.name}`;
  }
}

/** Go to a screen. */
export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

// ---------------------------------------------------------------------------
// "You have unsaved changes" protection.
//
// A screen with unsaved work calls useLeaveWarning(true, {...}). Then, if
// the address changes (a menu tap, a Back button, or the phone's back
// gesture), we put the old address back, ask the user, and only move on
// if they say "Leave".
// ---------------------------------------------------------------------------
let leaveWarning: ConfirmOptions | null = null;
// The address of the screen being shown right now.
let currentHash = typeof window === 'undefined' ? '' : window.location.hash;

/** Turn the warning off right away, e.g. just before navigating after a save. */
export function allowLeave() {
  leaveWarning = null;
}

/** Mode switches must ask before unmounting the form that owns this warning. */
export async function confirmLeave(): Promise<boolean> {
  const warning = leaveWarning;
  if (!warning) return true;
  if (!(await askConfirm(warning))) return false;
  if (leaveWarning === warning) allowLeave();
  return true;
}

export function useLeaveWarning(active: boolean, options: ConfirmOptions) {
  const { title, message, confirmLabel } = options;
  useEffect(() => {
    if (!active) return;
    leaveWarning = { title, message, confirmLabel, cancelLabel: 'Stay', danger: true };
    // Closing the tab or app: browsers only allow their own generic message.
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      leaveWarning = null;
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [active, title, message, confirmLabel]);
}

/**
 * A React "hook" that returns the current route and re-renders the app
 * whenever it changes (when navigate() is called or Back is pressed).
 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = async () => {
      const target = window.location.hash;
      if (leaveWarning && target !== currentHash) {
        const warning = leaveWarning;
        // Put the old address back while we ask. pushState changes the
        // address without firing another "hashchange" event.
        history.pushState(null, '', currentHash || '#/home');
        if (!(await askConfirm(warning))) return; // "Stay"
        leaveWarning = null;
        window.location.hash = target; // "Leave": go where they wanted
        return;
      }
      currentHash = target;
      setRoute(parseRoute(target));
    };
    window.addEventListener('hashchange', onChange);
    // The function returned here runs when the component goes away,
    // so we stop listening and don't leak memory.
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
