// ---------------------------------------------------------------------------
// AppContext.tsx — shared information every screen needs.
//
// React "context" lets any component read these values without passing
// them down through every layer by hand. Screens call useApp() to get:
//   - mode:     'real' or 'demo'
//   - storage:  the Storage object for the current mode
//   - profile:  the rider's profile (or undefined before setup)
//   - today:    today's date as "YYYY-MM-DD" (a fixed date in demo mode)
//   - setProfile: update the profile after saving it
//   - toggleDemo: switch demo mode on/off
//   - refreshAll: reload every screen's data (used by "Reset demo")
//   - showToast:  show a pop-up message that looks like a phone notification
// ---------------------------------------------------------------------------
import { createContext, useContext } from 'react';
import type { DataMode, Storage } from './lib/storage';
import type { Profile } from './types';

/** A pop-up message, styled like a phone notification. */
export interface ToastMessage {
  title: string;
  body: string;
}

export interface AppContextValue {
  mode: DataMode;
  storage: Storage;
  profile: Profile | undefined;
  today: string;
  setProfile(profile: Profile): void;
  toggleDemo(): void;
  refreshAll(): void;
  showToast(message: ToastMessage | null): void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp() must be used inside <AppContext.Provider>');
  return value;
}
