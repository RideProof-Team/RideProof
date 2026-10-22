// Tests for the complaint letter wording. Run with: npm test
import { describe, expect, it } from 'vitest';
import {
  buildComplaintLetter,
  dateRangePhrase,
  describeProblem,
  extraSentences,
  joinDates,
  joinWords,
  summarySentence,
} from './complaintLetter';
import { pdfSafe } from './pdfWriter';
import type { Profile, RideLog } from '../types';

let n = 0;
function log(rideDate: string, overrides: Partial<RideLog> = {}): RideLog {
  return {
    id: `l${n++}`,
    appointmentId: 'a',
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

describe('small wording helpers', () => {
  it('joins words naturally', () => {
    expect(joinWords(['A'])).toBe('A');
    expect(joinWords(['A', 'B'])).toBe('A and B');
    expect(joinWords(['A', 'B', 'C'])).toBe('A, B, and C');
  });

  it('says the year once when dates share a year', () => {
    expect(joinDates(['2026-10-14'])).toBe('October 14, 2026');
    expect(joinDates(['2026-10-14', '2026-10-21'])).toBe('October 14 and October 21, 2026');
    expect(joinDates(['2026-12-30', '2027-01-04'])).toBe('December 30, 2026 and January 4, 2027');
  });

  it('describes date ranges', () => {
    expect(dateRangePhrase('2026-09-30', '2026-10-28')).toBe('Between September 30 and October 28, 2026,');
    expect(dateRangePhrase('2026-12-15', '2027-01-10')).toBe('Between December 15, 2026 and January 10, 2027,');
    expect(dateRangePhrase('2026-10-14', '2026-10-14')).toBe('On October 14, 2026,');
  });
});

describe('summarySentence', () => {
  it('matches the RideConnect example sentence', () => {
    const problems = [
      log('2026-09-30', { pickupStatus: 'late', minutesLate: 15 }),
      log('2026-10-07', { pickupStatus: 'late', minutesLate: 30 }),
      log('2026-10-12', { pickupStatus: 'late', minutesLate: 15 }),
      log('2026-10-14', { pickupStatus: 'never_came', appointmentOutcome: 'missed' }),
      log('2026-10-16', { pickupStatus: 'late', minutesLate: 60 }),
      log('2026-10-21', { pickupStatus: 'never_came', appointmentOutcome: 'late' }),
      log('2026-10-28', { pickupStatus: 'late', minutesLate: 30 }),
    ];
    expect(summarySentence(problems)).toBe(
      'Between September 30 and October 28, 2026, my scheduled rides were late 5 times and did not arrive 2 times, ' +
        'causing me to miss my dialysis appointment on October 14, 2026.',
    );
  });

  it('uses "1 time" and leaves out parts with no problems', () => {
    expect(summarySentence([log('2026-10-02', { pickupStatus: 'late', minutesLate: 15 })])).toBe(
      'On October 2, 2026, my scheduled rides were late 1 time.',
    );
  });

  it('handles several missed appointments of different types', () => {
    const sentence = summarySentence([
      log('2026-10-14', { pickupStatus: 'never_came', appointmentOutcome: 'missed' }),
      log('2026-10-20', { pickupStatus: 'never_came', appointmentOutcome: 'missed', appointmentType: 'specialist' }),
    ]);
    expect(sentence).toBe(
      'Between October 14 and October 20, 2026, my scheduled rides did not arrive 2 times, ' +
        'causing me to miss my medical appointments on October 14 and October 20, 2026.',
    );
  });

  it('mentions a missed appointment even when pickups were on time', () => {
    expect(summarySentence([log('2026-10-14', { appointmentOutcome: 'missed', appointmentType: 'therapy' })])).toBe(
      'I missed my therapy appointment on October 14, 2026.',
    );
  });
});

describe('extra sentences and ride lines', () => {
  it('mentions stranded rides home and very late pickups', () => {
    expect(
      extraSentences([
        log('2026-10-16', { pickupStatus: 'late', minutesLate: 60 }),
        log('2026-10-19', { returnRideStatus: 'never_came' }),
      ]),
    ).toEqual([
      'One of these pickups was an hour or more late.',
      'My ride home never came on October 19, 2026, leaving me stranded after my appointment.',
    ]);
  });

  it('describes one ride, including notes', () => {
    expect(describeProblem(log('2026-10-19', { returnRideStatus: 'never_came', notes: 'Waited 2 hours for ride home' }))).toBe(
      'My ride home never came. Note: "Waited 2 hours for ride home"',
    );
    expect(describeProblem(log('2026-10-14', { pickupStatus: 'never_came', appointmentOutcome: 'missed' }))).toBe(
      'The ride never came. I missed my dialysis appointment.',
    );
  });
});

describe('buildComplaintLetter', () => {
  const profile: Profile = {
    role: 'caregiver',
    riderFirstName: 'Rosa',
    caregiverName: 'Maria',
    state: 'WA',
    rideCompanyName: 'Sample Ride Co.',
    rideCompanyPhone: '555-0100',
    healthPlanName: 'Sample Health Plan',
  };
  const period = { id: 'past-month', label: '', from: '2026-09-30', to: '2026-10-30' };
  const logs = [
    log('2026-10-05'),
    log('2026-10-14', { pickupStatus: 'never_came', appointmentOutcome: 'missed' }),
    log('2026-11-02', { pickupStatus: 'never_came' }), // outside the period
  ];
  const letter = buildComplaintLetter({ profile, logs, period, today: '2026-10-30', stateRule: undefined });

  it('is written in the rider\'s voice with the caregiver credited', () => {
    expect(letter).toContain('My name is Rosa. I am a Medicaid member enrolled in Sample Health Plan');
    expect(letter).toContain('prepared with help from my caregiver, Maria.');
  });

  it('only lists rides with problems inside the period', () => {
    expect(letter).toContain('I logged 2 rides during this time, and 1 ride had a problem.');
    expect(letter).toContain('- Wednesday, October 14, 2026: The ride never came. I missed my dialysis appointment.');
    expect(letter).not.toContain('November');
  });

  it('mentions dialysis risk when a dialysis ride failed', () => {
    expect(letter).toContain('Dialysis is a life-sustaining treatment.');
  });

  it('makes text safe for PDF fonts', () => {
    expect(pdfSafe('“Hi” — it’s… ✓')).toBe('"Hi" - it\'s... ');
  });
});
