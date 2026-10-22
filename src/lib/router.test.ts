import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash, type Route } from './router';
import { validateAppointment } from './validateAppointment';

describe('router', () => {
  it('turns routes into addresses and back again', () => {
    const routes: Route[] = [
      { name: 'landing' },
      { name: 'signin' },
      { name: 'setup' },
      { name: 'home' },
      { name: 'appointments' },
      { name: 'appointment-new' },
      { name: 'appointment-edit', id: 'abc-123' },
      { name: 'checkin' },
      { name: 'checkin', appointmentId: 'abc', date: '2026-10-30' },
      { name: 'history' },
      { name: 'wait' },
      { name: 'wait', id: 'demo-dialysis|2026-10-30|return' },
      { name: 'report' },
      { name: 'complaint' },
      { name: 'complaint', periodId: '2026-10' },
      { name: 'complaint', followUpOf: 'demo-complaint' },
      { name: 'complaints' },
      { name: 'complaints', id: 'abc-123' },
      { name: 'complaint-sent' },
      { name: 'complaint-sent', followUpOf: 'abc-123' },
      { name: 'help' },
      { name: 'settings' },
      { name: 'profile-edit' },
    ];
    for (const route of routes) {
      expect(parseRoute(routeToHash(route))).toEqual(route);
    }
  });

  it('opens the landing page at the root and keeps unknown routes recoverable', () => {
    expect(parseRoute('')).toEqual({ name: 'landing' });
    expect(parseRoute('#/nonsense')).toEqual({ name: 'home' });
  });
});

describe('validateAppointment', () => {
  const good = {
    id: 'a',
    date: '2026-11-05',
    time: '09:00',
    clinicName: 'Clinic',
    clinicAddress: '',
    type: 'checkup' as const,
    recurrence: { kind: 'none' as const },
    rideBooked: false,
    confirmationNumber: '',
  };

  it('accepts a complete appointment', () => {
    expect(validateAppointment(good)).toEqual({});
  });

  it('requires date, time, and clinic name', () => {
    const errors = validateAppointment({ ...good, date: '', time: '', clinicName: ' ' });
    expect(Object.keys(errors).sort()).toEqual(['clinicName', 'date', 'time']);
  });

  it('requires at least one weekday for a weekly appointment', () => {
    expect(validateAppointment({ ...good, recurrence: { kind: 'weekly', weekdays: [] } }).weekdays).toBeDefined();
    expect(validateAppointment({ ...good, recurrence: { kind: 'weekly', weekdays: [2] } })).toEqual({});
  });
});
