// Tests for demo mode: the story matches the script, and demo data never
// mixes with real data. Run with: npm test
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_TODAY } from './clock';
import { buildComplaintLetter } from './complaintLetter';
import { findLog } from './checkinFlow';
import { weekdayOf } from './dates';
import { DEMO_APPOINTMENTS, DEMO_PROFILE, DEMO_RIDE_LOGS, resetDemo, seedDemoIfEmpty } from './demoData';
import { tripsBetween } from './recurrence';
import { bookingReminders } from './reminders';
import { computeStats, findPeriod, reportPeriods } from './reportStats';
import { getStateRule } from './stateRules';
import { createStorage } from './storage';
import type { Profile } from '../types';

describe('the demo story', () => {
  const stats = computeStats(DEMO_RIDE_LOGS, '2026-01-01', '2026-12-31');

  it('has 13 dialysis rides: 5 late, 2 no-shows, 1 missed, 1 stranded', () => {
    expect(stats.totalRides).toBe(13);
    expect(stats.latePickups).toBe(5);
    expect(stats.noShows).toBe(2);
    expect(stats.missedAppointments).toBe(1);
    expect(stats.strandedReturns).toBe(1);
    // A mix of 15, 30, and 60+ minutes late.
    expect(stats.late15).toBeGreaterThan(0);
    expect(stats.late30).toBeGreaterThan(0);
    expect(stats.late60).toBeGreaterThan(0);
  });

  it('has the stranded ride note', () => {
    const stranded = DEMO_RIDE_LOGS.find((l) => l.returnRideStatus === 'never_came');
    expect(stranded?.notes).toContain('Waited 2 hours for ride home');
  });

  it('only logs Mon/Wed/Fri rides, all before demo "today"', () => {
    for (const log of DEMO_RIDE_LOGS) {
      expect([1, 3, 5]).toContain(weekdayOf(log.rideDate));
      expect(log.rideDate < DEMO_TODAY).toBe(true);
    }
  });

  it('has a dialysis appointment today that is ready for check-in', () => {
    const todays = tripsBetween(DEMO_APPOINTMENTS, DEMO_TODAY, DEMO_TODAY);
    expect(todays.map((t) => t.appointment.type)).toEqual(['dialysis']);
    expect(findLog(DEMO_RIDE_LOGS, todays[0].appointment.id, DEMO_TODAY)).toBeUndefined();
  });

  it('shows a booking reminder for the unbooked cardiology appointment', () => {
    const rule = getStateRule(DEMO_PROFILE.state)!;
    const reminders = bookingReminders(DEMO_APPOINTMENTS, DEMO_TODAY, rule.bookingWindowBusinessDays);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].appointment.id).toBe('demo-cardiology');
  });

  it('writes the complaint letter sentence from the pitch script', () => {
    const period = findPeriod(reportPeriods(DEMO_TODAY, DEMO_RIDE_LOGS), 'past-month');
    const letter = buildComplaintLetter({
      profile: DEMO_PROFILE,
      logs: DEMO_RIDE_LOGS,
      period,
      today: DEMO_TODAY,
      stateRule: getStateRule('WA'),
    });
    expect(letter).toContain(
      'Between September 30 and October 28, 2026, my scheduled rides were late 5 times and did not arrive 2 times, ' +
        'causing me to miss my dialysis appointment on October 14, 2026.',
    );
    expect(letter).toContain('prepared with help from my caregiver, Maria.');
  });

  it('uses only fake contact details', () => {
    expect(DEMO_PROFILE.rideCompanyPhone).toBe('555-0100');
    expect(DEMO_PROFILE.rideCompanyName).toContain('Sample');
  });
});

describe('demo data never mixes with real data', () => {
  const real = createStorage('real');
  const demo = createStorage('demo');
  const realProfile: Profile = { ...DEMO_PROFILE, role: 'rider', riderFirstName: 'Real Person', caregiverName: '' };

  beforeEach(async () => {
    await real.clearAll();
    await demo.clearAll();
  });

  it('refuses to write demo data into real storage', async () => {
    await expect(seedDemoIfEmpty(real)).rejects.toThrow();
    await expect(resetDemo(real)).rejects.toThrow();
    expect(await real.getProfile()).toBeUndefined();
  });

  it('seeding and resetting the demo leaves real data exactly as it was', async () => {
    await real.saveProfile(realProfile);
    await seedDemoIfEmpty(demo);
    await resetDemo(demo);

    expect(await real.getProfile()).toEqual(realProfile);
    expect(await real.listAppointments()).toEqual([]);
    expect(await real.listRideLogs()).toEqual([]);
    expect((await demo.listRideLogs())).toHaveLength(13);
  });

  it('seeding does not overwrite demo changes, but reset does', async () => {
    await seedDemoIfEmpty(demo);
    await demo.saveAppointment({ ...DEMO_APPOINTMENTS[1], rideBooked: true });
    await demo.deleteRideLog(DEMO_RIDE_LOGS[0].id);

    await seedDemoIfEmpty(demo); // e.g. the page reloaded mid-demo
    expect(await demo.listRideLogs()).toHaveLength(12);

    await resetDemo(demo);
    expect(await demo.listRideLogs()).toHaveLength(13);
    const cardiology = (await demo.listAppointments()).find((a) => a.id === 'demo-cardiology');
    expect(cardiology?.rideBooked).toBe(false);
  });
});
