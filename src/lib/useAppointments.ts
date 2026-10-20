// ---------------------------------------------------------------------------
// useAppointments.ts — a React hook that loads the appointment list from
// storage. Several screens need appointments, so this is written once.
//
// Returns the list (undefined while still loading) and a reload() function
// to call after something changes.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import type { Appointment } from '../types';

export function useAppointments() {
  const { storage } = useApp();
  const [appointments, setAppointments] = useState<Appointment[] | undefined>(undefined);

  const reload = useCallback(async () => {
    setAppointments(await storage.listAppointments());
  }, [storage]);

  // Load once when the screen opens, and again if storage changes
  // (that happens when demo mode is switched on or off).
  useEffect(() => {
    let cancelled = false;
    storage.listAppointments().then((list) => {
      if (!cancelled) setAppointments(list);
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  return { appointments, reload };
}
