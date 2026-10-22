// ---------------------------------------------------------------------------
// useRideData.ts — a React hook that loads appointments AND ride logs from
// storage. Most screens need both, so it's written once here.
//
// Returns `data` (undefined while still loading) and a reload() function
// to call after something changes.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import type { Storage } from './storage';
import type { ActiveWait, Appointment, RideLog } from '../types';

export interface RideData {
  appointments: Appointment[];
  rideLogs: RideLog[];
  /** "Where's my ride?" timers (running or just finished). */
  waits: ActiveWait[];
}

async function loadAll(storage: Storage): Promise<RideData> {
  // Promise.all runs both loads at the same time instead of one after another.
  const [appointments, rideLogs, waits] = await Promise.all([
    storage.listAppointments(),
    storage.listRideLogs(),
    storage.listWaits(),
  ]);
  return { appointments, rideLogs, waits };
}

export function useRideData() {
  const { storage } = useApp();
  const [data, setData] = useState<RideData | undefined>(undefined);

  const reload = useCallback(async () => {
    setData(await loadAll(storage));
  }, [storage]);

  // Load when the screen opens, and again if storage changes
  // (that happens when demo mode is switched on or off).
  useEffect(() => {
    let cancelled = false;
    loadAll(storage).then((loaded) => {
      if (!cancelled) setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  return { data, reload };
}
