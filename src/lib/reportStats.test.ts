// Tests for report statistics. Run with: npm test
import { describe, expect, it } from 'vitest';
import { computeStats, findPeriod, headline, mondayOf, oneMonthBefore, reportPeriods, weeklyCounts } from './reportStats';
import type { RideLog } from '../types';

let nextId = 0;
function log(rideDate: string, overrides: Partial<RideLog> = {}): RideLog {
  return {
    id: `log-${nextId++}`,
    appointmentId: 'appt',
    clinicName: 'Clinic',
    appointmentType: 'dialysis',
    rideDate,
    pickupStatus: 'on_time',
    minutesLate: null,
    appointmentOutcome: 'made_it',
    returnRideStatus: 'on_time',
    notes: '',
    recordedAt: `${rideDate}T15:00:00.000Z`,
    ...overrides,
  };
}

const logs: RideLog[] = [
  log('2026-09-15'), // outside the October range
  log('2026-10-02', { pickupStatus: 'late', minutesLate: 15 }),
  log('2026-10-05'),
  log('2026-10-07', { pickupStatus: 'late', minutesLate: 30, appointmentOutcome: 'late' }),
  log('2026-10-14', { pickupStatus: 'never_came', appointmentOutcome: 'missed', returnRideStatus: 'not_needed' }),
  log('2026-10-16', { pickupStatus: 'late', minutesLate: 60, appointmentOutcome: 'late' }),
  log('2026-10-19', { returnRideStatus: 'never_came' }),
  log('2026-10-21', { pickupStatus: 'never_came', appointmentOutcome: 'late' }),
  log('2026-10-23', { returnRideStatus: 'late' }),
];

describe('computeStats', () => {
  it('counts every kind of problem in the period', () => {
    expect(computeStats(logs, '2026-10-01', '2026-10-31')).toEqual({
      totalRides: 8,
      onTime: 3,
      latePickups: 3,
      late15: 1,
      late30: 1,
      late60: 1,
      noShows: 2,
      missedAppointments: 1,
      strandedReturns: 1,
      lateReturns: 1,
      // 15 + 30 + 60 minutes late. "60" means "an hour or more", so it's "at least".
      waitMinutes: 105,
      waitPrecision: 'at_least',
      // 2 pickups and 1 ride home never came, with no timer: not guessed.
      untimedNeverCame: 3,
      // The late ride home has no minutes (an older-style check-in).
      untimedLate: 1,
      failedBookings: 0,
      problemRides: 7, // every October ride except Oct 5
      failedBookingsByReason: { no_answer: 0, no_rides: 0, too_late: 0, other: 0 },
      firstDate: '2026-10-02',
      lastDate: '2026-10-23',
    });
  });

  it('includes rides on the first and last day of the range', () => {
    expect(computeStats(logs, '2026-10-02', '2026-10-02').totalRides).toBe(1);
  });

  it('returns zeros for a period with no rides', () => {
    const stats = computeStats(logs, '2027-01-01', '2027-01-31');
    expect(stats.totalRides).toBe(0);
    expect(stats.firstDate).toBeNull();
    expect(headline(stats)).toBe('No rides logged in this period.');
  });
});

describe('headline', () => {
  it('summarizes problems in one sentence', () => {
    expect(headline(computeStats(logs, '2026-10-01', '2026-10-31'))).toBe(
      '5 of 8 rides had a problem: 3 were late, and 2 never came.',
    );
    expect(headline(computeStats(logs, '2026-10-05', '2026-10-05'))).toBe('All 1 ride picked up on time.');
    expect(headline(computeStats(logs, '2026-10-02', '2026-10-02'))).toBe('1 of 1 ride had a problem: 1 was late.');
  });
});

describe('report periods', () => {
  it('goes back one month, even from a long month to a short one', () => {
    expect(oneMonthBefore('2026-10-30')).toBe('2026-09-30');
    expect(oneMonthBefore('2026-03-31')).toBe('2026-02-28');
    expect(oneMonthBefore('2026-01-15')).toBe('2025-12-15');
  });

  it('offers "Past month" plus each month that has rides, newest first', () => {
    const periods = reportPeriods('2026-10-30', logs);
    expect(periods.map((p) => p.id)).toEqual(['past-month', '2026-10', '2026-09']);
    expect(periods[0]).toMatchObject({ from: '2026-09-30', to: '2026-10-30' });
    expect(periods[1]).toMatchObject({ label: 'October 2026', from: '2026-10-01', to: '2026-10-31' });
    expect(findPeriod(periods, 'nope').id).toBe('past-month');
  });
});

describe('weeklyCounts', () => {
  it('finds the Monday that starts each week', () => {
    expect(mondayOf('2026-10-30')).toBe('2026-10-26'); // Friday
    expect(mondayOf('2026-10-26')).toBe('2026-10-26'); // Monday
    expect(mondayOf('2026-11-01')).toBe('2026-10-26'); // Sunday belongs to the week before
  });

  it('counts each week, including weeks with no rides', () => {
    const weeks = weeklyCounts(logs, '2026-09-30', '2026-10-30');
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
    expect(weeks[2]).toMatchObject({ label: 'Oct 12', onTime: 0, late: 1, noShow: 1 });
    expect(weeks[4]).toMatchObject({ onTime: 0, late: 0, noShow: 0 });
  });
});
