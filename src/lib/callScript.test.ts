// Tests for the booking call script and failed booking calls. Run with: npm test
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup } from './backup';
import { attemptsForTrip, attemptsInRange, describeAttempt, newFailedBooking } from './bookingAttempts';
import { buildCallScript, suggestedPickup } from './callScript';
import { DEMO_TODAY } from './clock';
import { attemptsLetterSentence, buildComplaintLetter, buildFollowUpLetter } from './complaintLetter';
import { DEMO_APPOINTMENTS, DEMO_BOOKING_ATTEMPTS, DEMO_COMPLAINTS, DEMO_PROFILE, DEMO_RIDE_LOGS, resetDemo, seedDemoIfEmpty } from './demoData';
import { buildReportPdf } from './pdfReport';
import { computeStats, findPeriod, reportPeriods } from './reportStats';
import { getStateRule } from './stateRules';
import { createStorage, DB_NAMES, DB_VERSION } from './storage';
import type { Appointment, FailedBooking, Profile } from '../types';

const cardiology = DEMO_APPOINTMENTS[1];
const rider: Profile = {
  role: 'rider', riderFirstName: 'Sam', caregiverName: '', state: 'WA',
  rideCompanyName: 'Sample Ride Co.', rideCompanyPhone: '555-0100', healthPlanName: '',
};
const appt: Appointment = {
  id: 'a1', date: '2026-11-05', time: '09:00', clinicName: 'Sample Clinic', clinicAddress: '', type: 'checkup',
  recurrence: { kind: 'none' }, rideBooked: false, confirmationNumber: '',
};
const script = (overrides: Partial<Parameters<typeof buildCallScript>[0]> = {}) =>
  buildCallScript({ profile: rider, appointment: appt, tripDate: '2026-11-05', pickupTime: '08:00', returnTime: '', noReturnRide: false, notes: '', ...overrides });

describe('the "What to say" script', () => {
  it('suggests a pickup 60 minutes before, unless a pickup time was saved', () => {
    expect(suggestedPickup(appt)).toBe('08:00');
    expect(suggestedPickup({ ...appt, time: '00:30' })).toBe('00:00'); // never before midnight
    expect(suggestedPickup({ ...appt, pickupTime: '07:45' })).toBe('07:45');
  });

  it('uses [brackets] for everything not entered', () => {
    expect(script({ pickupTime: '' })).toBe(
      [
        "Hi, my name is Sam. I'm calling to book a Medicaid ride.",
        'My Medicaid ID number is [Medicaid ID number].',
        'The checkup appointment is on Thursday, November 5, 2026 at 9:00 AM.',
        "It's at Sample Clinic, [clinic address].",
        'Please pick me up at [home address] at [pickup time].',
        "I will also need a ride home at [time you'll be ready].",
        '[Any mobility needs, like a walker or wheelchair]',
        'Can you read back the pickup time and give me a confirmation number?',
      ].join('\n'),
    );
  });

  it('fills in everything that is known, in caregiver mode', () => {
    const text = buildCallScript({
      profile: DEMO_PROFILE, appointment: cardiology, tripDate: '2026-11-03',
      pickupTime: suggestedPickup(cardiology), returnTime: '12:15', noReturnRide: false, notes: 'Please call when outside.',
    });
    expect(text).toContain("Hi, my name is Maria. I'm calling to book a Medicaid ride for Rosa.");
    expect(text).toContain("Rosa's Medicaid ID number is [Medicaid ID number].");
    expect(text).toContain('The specialist appointment is on Tuesday, November 3, 2026 at 10:30 AM.');
    expect(text).toContain("It's at Sample Heart Clinic (cardiology), 200 Example Avenue, Sampletown.");
    expect(text).toContain('Please pick Rosa up at 300 Sample Lane, Sampletown at 9:30 AM.');
    expect(text).toContain('Rosa will also need a ride home at 12:15 PM.');
    expect(text).toContain('Rosa uses a walker.');
    expect(text).toContain('Also: Please call when outside.');
    // Only the Medicaid ID is left to fill in (RideConnect never stores it).
    expect(text.match(/\[/g)).toHaveLength(1);
  });

  it('describes each mobility need and "no ride home"', () => {
    expect(script({ profile: { ...rider, mobilityNeeds: 'wheelchair' } })).toContain('I use a wheelchair and need a wheelchair-accessible vehicle.');
    expect(script({ profile: { ...rider, mobilityNeeds: 'needs_help' } })).toContain('I need help getting to and into the vehicle.');
    expect(script({ profile: { ...rider, mobilityNeeds: 'none' } })).toContain("I don't need any special help with the vehicle.");
    expect(script({ noReturnRide: true })).toContain("I won't need a ride home.");
    expect(script({ profile: { ...rider, role: 'caregiver' } })).toContain('Hi, my name is [your name].');
  });
});

const failed = (attemptedOn: string, overrides: Partial<FailedBooking> = {}): FailedBooking => ({
  ...newFailedBooking(`f-${attemptedOn}`, cardiology, '2026-11-03', attemptedOn, 'no_answer', '', `${attemptedOn}T12:00:00.000Z`),
  ...overrides,
});

describe('failed booking calls are evidence', () => {
  it('are counted by computeStats, by the day of the call', () => {
    const attempts = [failed('2026-10-20'), failed('2026-10-29', { reason: 'no_rides' }), failed('2026-11-02')];
    const stats = computeStats([], '2026-10-01', '2026-10-31', attempts);
    expect(stats.failedBookings).toBe(2);
    expect(stats.failedBookingsByReason).toEqual({ no_answer: 1, no_rides: 1, too_late: 0, other: 0 });
    expect(attemptsInRange(attempts, '2026-10-01', '2026-10-31').map((a) => a.attemptedOn)).toEqual(['2026-10-20', '2026-10-29']);
    // Leaving attempts out counts none (older callers still work).
    expect(computeStats(DEMO_RIDE_LOGS, '2026-10-01', '2026-10-31').failedBookings).toBe(0);
  });

  it('newest attempt for a trip comes first', () => {
    const attempts = [failed('2026-10-20'), failed('2026-10-29'), failed('2026-10-29', { id: 'other', tripDate: '2026-11-10' })];
    expect(attemptsForTrip(attempts, 'demo-cardiology', '2026-11-03').map((a) => a.attemptedOn)).toEqual(['2026-10-29', '2026-10-20']);
    // Sorted by the day of the call, even if a record was saved with an older clock (demo mode).
    const odd = [failed('2026-10-29'), failed('2026-10-30', { id: 'late', recordedAt: '2026-10-01T00:00:00.000Z' })];
    expect(attemptsForTrip(odd, 'demo-cardiology', '2026-11-03')[0].id).toBe('late');
  });

  it('a failed call never marks the ride booked', () => {
    const record = newFailedBooking('x', cardiology, '2026-11-03', DEMO_TODAY, 'too_late', '  Said 3 days needed ', 'now');
    expect(record).toMatchObject({ reason: 'too_late', details: 'Said 3 days needed', clinicName: cardiology.clinicName });
    expect('rideBooked' in record).toBe(false);
    expect(cardiology.rideBooked).toBe(false);
  });

  it('show up in the letter, the follow-up letter, and the PDF', () => {
    const period = findPeriod(reportPeriods(DEMO_TODAY, DEMO_RIDE_LOGS), 'past-month');
    const letter = buildComplaintLetter({
      profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, period, today: DEMO_TODAY, stateRule: getStateRule('WA'), attempts: DEMO_BOOKING_ATTEMPTS,
    });
    expect(letter).toContain('I also called to book a ride 1 time and could not get one booked (on October 29, 2026).');
    expect(letter).toContain('Calls to book a ride that did not work:');
    expect(letter).toContain(
      `- Thursday, October 29, 2026: When I called to book my ride for Tuesday, November 3, 2026: couldn't get through. Note: "On hold for 25 minutes, then the call dropped."`,
    );

    const followUp = buildFollowUpLetter({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, complaint: DEMO_COMPLAINTS[0], today: DEMO_TODAY, attempts: DEMO_BOOKING_ATTEMPTS });
    expect(followUp).toContain('I also called to book a ride 1 time');

    const pdf = buildReportPdf({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, period, today: DEMO_TODAY, chartImage: null, attempts: DEMO_BOOKING_ATTEMPTS });
    const pdfText = [...pdf.doc.output().matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].map((m) => m[1].replace(/\\([()\\])/g, '$1')).join(' ');
    expect(pdfText).toContain('Calls to book a ride that failed');
    expect(pdfText).toContain('Calls to book a ride that did not work');
    expect(pdfText).toContain("couldn't get through");
  });

  it('a letter about ONLY failed calls still makes sense', () => {
    const letter = buildComplaintLetter({
      profile: rider, logs: [], period: { id: 'p', label: 'p', from: '2026-10-01', to: '2026-10-31' }, today: DEMO_TODAY, stateRule: undefined,
      attempts: [failed('2026-10-20'), failed('2026-10-22')],
    });
    expect(letter).toContain('I also called to book a ride 2 times and could not get one booked (on October 20 and October 22, 2026).');
    expect(letter).not.toContain('Here is my record of each one');
    expect(attemptsLetterSentence([])).toBe('');
    expect(describeAttempt(failed('2026-10-20', { reason: 'other' }))).toBe(
      'When I called to book my ride for Tuesday, November 3, 2026: could not book.',
    );
  });
});

describe('storage and backups', () => {
  const real = createStorage('real');
  beforeEach(async () => {
    await real.clearAll();
  });

  it('backs up failed calls and the new profile fields', async () => {
    await real.saveProfile(DEMO_PROFILE);
    await real.saveBookingAttempt(DEMO_BOOKING_ATTEMPTS[0]);
    const file = JSON.stringify(await createBackup(real, 'now'));
    await real.clearAll();
    await restoreBackup(real, parseBackup(file));
    expect(await real.getProfile()).toEqual(DEMO_PROFILE);
    expect(await real.listBookingAttempts()).toEqual(DEMO_BOOKING_ATTEMPTS);
  });

  it('older backups (version 2, no booking calls or mobility) still restore', () => {
    const { mobilityNeeds: _m, homeAddress: _h, ...oldProfile } = DEMO_PROFILE;
    const parsed = parseBackup(JSON.stringify({ format: 'rideproof-backup', version: 2, profile: oldProfile, appointments: [], rideLogs: [], complaints: [] }));
    expect(parsed.bookingAttempts).toEqual([]);
    expect(parsed.profile.mobilityNeeds).toBeUndefined();
    expect(parsed.profile.homeAddress).toBeUndefined();
  });

  it('explains damaged new fields in plain language', () => {
    const file = (extra: object) => JSON.stringify({ format: 'rideproof-backup', version: 3, profile: DEMO_PROFILE, appointments: [], rideLogs: [], ...extra });
    expect(() => parseBackup(file({ profile: { ...DEMO_PROFILE, mobilityNeeds: 'jetpack' } }))).toThrow(
      'The mobility needs setting in this file is damaged. It must be none, walker, wheelchair, or needs help.',
    );
    expect(() => parseBackup(file({ bookingAttempts: [{ ...DEMO_BOOKING_ATTEMPTS[0], reason: 'aliens' }] }))).toThrow(
      'The booking call on October 29, 2026 has a damaged reason.',
    );
    expect(() => parseBackup(file({ bookingAttempts: [{ id: 'x' }] }))).toThrow('A record of a booking call in this file is damaged.');
  });

  it('upgrading the database from version 3 keeps complaints and adds the booking-calls box, in both databases', async () => {
    for (const mode of ['real', 'demo'] as const) {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(DB_NAMES[mode]);
        request.onsuccess = request.onerror = resolve;
      });
      const old = await openDB(DB_NAMES[mode], 3, {
        upgrade(db) {
          for (const name of ['appointments', 'rideLogs', 'waits', 'complaints']) db.createObjectStore(name, { keyPath: 'id' });
          db.createObjectStore('profile');
        },
      });
      await old.put('complaints', DEMO_COMPLAINTS[0]);
      await old.put('appointments', cardiology);
      old.close();
      const storage = createStorage(mode);
      expect(await storage.listComplaints()).toEqual(DEMO_COMPLAINTS);
      expect(await storage.listAppointments()).toEqual([cardiology]);
      expect(await storage.listBookingAttempts()).toEqual([]);
      await storage.clearAll();
    }
    expect(DB_VERSION).toBeGreaterThanOrEqual(4);
  });
});

describe('demo booking call', () => {
  it('Maria couldn’t get through on Oct 29; the ride stays unbooked; Reset demo restores it', async () => {
    const demo = createStorage('demo');
    await demo.clearAll();
    await seedDemoIfEmpty(demo);
    expect(await demo.listBookingAttempts()).toEqual(DEMO_BOOKING_ATTEMPTS);
    expect((await demo.listAppointments()).find((a) => a.id === 'demo-cardiology')?.rideBooked).toBe(false);
    await demo.deleteBookingAttempt('demo-booking-call');
    await resetDemo(demo);
    expect(await demo.listBookingAttempts()).toHaveLength(1);
  });
});
