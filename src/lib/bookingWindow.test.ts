// Tests for the rider-entered booking window. Run with: npm test
import { describe, expect, it } from 'vitest';
import { BackupError, createBackup, parseBackup } from './backup';
import { businessDaysText, effectiveBookingWindow, isValidRiderBookingWindow } from './bookingWindow';
import { bookingReminders } from './reminders';
import { getStateRule } from './stateRules';
import { createStorage } from './storage';
import type { Appointment, Profile } from '../types';

const alaskaRider: Profile = {
  role: 'rider',
  riderFirstName: 'Sam',
  caregiverName: '',
  state: 'AK', // a real state with NO detailed rules in stateRules.json
  rideCompanyName: 'Sample Ride Co.',
  rideCompanyPhone: '555-0100',
  healthPlanName: '',
};
const washingtonRider: Profile = { ...alaskaRider, state: 'WA' }; // has a (placeholder) rule: 2 days

// An unbooked appointment on Tuesday, November 3, 2026.
const appointment: Appointment = {
  id: 'a',
  date: '2026-11-03',
  time: '10:30',
  clinicName: 'Sample Clinic',
  clinicAddress: '',
  type: 'specialist',
  recurrence: { kind: 'none' },
  rideBooked: false,
  confirmationNumber: '',
};

describe('which booking window is used', () => {
  it('uses the rider\'s own number first', () => {
    const result = effectiveBookingWindow({ ...washingtonRider, riderBookingWindow: 5 }, getStateRule('WA'));
    expect(result).toEqual({ days: 5, source: 'rider', stateDays: 2 });
  });

  it('then the state\'s rule', () => {
    expect(effectiveBookingWindow(washingtonRider, getStateRule('WA'))).toEqual({ days: 2, source: 'state', stateDays: 2 });
    // "Not sure" doesn't override the state's rule.
    expect(effectiveBookingWindow({ ...washingtonRider, riderBookingWindow: 'not_sure' }, getStateRule('WA')).source).toBe('state');
  });

  it('then nothing (no reminders), for a state without rules and no answer', () => {
    expect(getStateRule('AK')).toBeUndefined();
    expect(effectiveBookingWindow(alaskaRider, undefined)).toEqual({ days: null, source: 'none', stateDays: null });
    expect(effectiveBookingWindow({ ...alaskaRider, riderBookingWindow: 'not_sure' }, undefined).source).toBe('none');
  });

  it('ignores impossible stored values', () => {
    expect(effectiveBookingWindow({ ...alaskaRider, riderBookingWindow: 0 }, undefined).source).toBe('none');
    expect(effectiveBookingWindow({ ...alaskaRider, riderBookingWindow: 99 }, undefined).source).toBe('none');
    expect(isValidRiderBookingWindow(14)).toBe(true);
    expect(isValidRiderBookingWindow(15)).toBe(false);
    expect(isValidRiderBookingWindow(2.5)).toBe(false);
    expect(isValidRiderBookingWindow('not_sure')).toBe(true);
  });

  it('writes "1 business day" and "2 business days"', () => {
    expect(businessDaysText(1)).toBe('1 business day');
    expect(businessDaysText(2)).toBe('2 business days');
  });
});

describe('reminders for a state without rules', () => {
  // The same steps Home uses: work out the window, then the reminders.
  const remindersFor = (profile: Profile, today: string) => {
    const { days } = effectiveBookingWindow(profile, getStateRule(profile.state));
    return days === null ? [] : bookingReminders([appointment], today, days);
  };

  it('shows no reminders before the rider enters a number', () => {
    expect(remindersFor(alaskaRider, '2026-10-30')).toEqual([]);
  });

  it('shows reminders once a number is entered', () => {
    // 3 business days before Tue Nov 3 = Thu Oct 29 (the weekend doesn't count).
    const [reminder] = remindersFor({ ...alaskaRider, riderBookingWindow: 3 }, '2026-10-27');
    expect(reminder).toMatchObject({ deadline: '2026-10-29', urgency: 'soon' });
  });

  it('uses the rider\'s override instead of the state rule', () => {
    // Washington's rule (2 days) gives Fri Oct 30; the rider's 4 days gives Wed Oct 28.
    expect(remindersFor(washingtonRider, '2026-10-26')[0].deadline).toBe('2026-10-30');
    expect(remindersFor({ ...washingtonRider, riderBookingWindow: 4 }, '2026-10-26')[0].deadline).toBe('2026-10-28');
  });
});

describe('backups keep the booking window', () => {
  const storage = createStorage('real');

  it('saves and restores the rider\'s number', async () => {
    await storage.clearAll();
    await storage.saveProfile({ ...alaskaRider, riderBookingWindow: 3 });
    const restored = parseBackup(JSON.stringify(await createBackup(storage, '2026-10-30T12:00:00.000Z')));
    expect(restored.profile.riderBookingWindow).toBe(3);
    await storage.clearAll();
  });

  it('restores older backups that don\'t have the field', () => {
    const old = { format: 'rideproof-backup', version: 1, exportedAt: '', profile: alaskaRider, appointments: [], rideLogs: [] };
    expect(parseBackup(JSON.stringify(old)).profile.riderBookingWindow).toBeUndefined();
  });

  it('explains a damaged value in plain language', () => {
    const bad = { format: 'rideproof-backup', version: 1, exportedAt: '', profile: { ...alaskaRider, riderBookingWindow: 40 }, appointments: [], rideLogs: [] };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify(bad))).toThrow('must be a number of business days from 1 to 14');
  });
});
