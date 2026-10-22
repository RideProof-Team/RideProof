// Tests for "total time lost". Run with: npm test
import { describe, expect, it } from 'vitest';
import { BackupError, parseBackup } from './backup';
import { buildRideLog, nextStep, stepsFor } from './checkinFlow';
import { DEMO_TODAY } from './clock';
import { buildComplaintLetter } from './complaintLetter';
import { DEMO_PROFILE, DEMO_RIDE_LOGS } from './demoData';
import { buildReportPdf } from './pdfReport';
import { computeStats, findPeriod, reportPeriods } from './reportStats';
import { getStateRule } from './stateRules';
import {
  durationWithPrecision,
  formatDuration,
  rideWait,
  timeLostHeadline,
  timeLostLetterSentence,
  timeLostNotCounted,
} from './timeLost';
import type { RideLog } from '../types';

let n = 0;
function log(overrides: Partial<RideLog>): RideLog {
  return {
    id: `l${n++}`,
    appointmentId: 'a',
    clinicName: 'Sample Clinic',
    appointmentType: 'dialysis',
    rideDate: '2026-10-05',
    pickupStatus: 'on_time',
    minutesLate: null,
    appointmentOutcome: 'made_it',
    returnRideStatus: 'on_time',
    notes: '',
    recordedAt: '2026-10-05T18:00:00.000Z',
    ...overrides,
  };
}
const stats = (logs: RideLog[]) => computeStats(logs, '2026-01-01', '2026-12-31');

describe('the math', () => {
  it('adds late pickups and late rides home', () => {
    const s = stats([
      log({ pickupStatus: 'late', minutesLate: 15 }),
      log({ pickupStatus: 'late', minutesLate: 30, returnRideStatus: 'late', returnMinutesLate: 15 }),
    ]);
    expect(s.waitMinutes).toBe(60);
    expect(s.waitPrecision).toBe('about'); // 15 and 30 are "about" answers
  });

  it('counts "an hour or more" as 60 and makes the total "at least"', () => {
    const s = stats([log({ pickupStatus: 'late', minutesLate: 60 }), log({ pickupStatus: 'late', minutesLate: 15 })]);
    expect(s.waitMinutes).toBe(75);
    expect(s.waitPrecision).toBe('at_least');
  });

  it('prefers an exact timer measurement over the 15/30/60 answer', () => {
    expect(rideWait(log({ pickupStatus: 'late', minutesLate: 60, pickupWaitMinutes: 83 })).minutes).toBe(83);
    const s = stats([log({ pickupStatus: 'late', minutesLate: 60, pickupWaitMinutes: 83 })]);
    expect(s.waitPrecision).toBe('exact');
  });

  it('never guesses a wait for a ride that never came; it counts it separately', () => {
    const s = stats([
      log({ pickupStatus: 'never_came', appointmentOutcome: 'missed', returnRideStatus: 'not_needed' }),
      log({ returnRideStatus: 'never_came' }),
    ]);
    expect(s.waitMinutes).toBe(0);
    expect(s.untimedNeverCame).toBe(2);
  });

  it('uses the timer for a ride that never came when it was measured', () => {
    const s = stats([log({ returnRideStatus: 'never_came', returnWaitMinutes: 120 })]);
    expect(s.waitMinutes).toBe(120);
    expect(s.untimedNeverCame).toBe(0);
  });

  it('counts older late-ride-home check-ins (no minutes) separately', () => {
    const s = stats([log({ returnRideStatus: 'late' })]);
    expect(s.waitMinutes).toBe(0);
    expect(s.untimedLate).toBe(1);
  });

  it('ignores on-time rides and rides outside the period', () => {
    expect(computeStats([log({ pickupStatus: 'late', minutesLate: 30, rideDate: '2025-01-01' })], '2026-01-01', '2026-12-31').waitMinutes).toBe(0);
    expect(stats([log({})]).waitMinutes).toBe(0);
  });
});

describe('the wording', () => {
  it('writes hours and minutes with singular and plural', () => {
    expect(formatDuration(375)).toBe('6 hours 15 minutes');
    expect(formatDuration(60)).toBe('1 hour');
    expect(formatDuration(61)).toBe('1 hour 1 minute');
    expect(formatDuration(45)).toBe('45 minutes');
    expect(formatDuration(1)).toBe('1 minute');
    expect(formatDuration(120)).toBe('2 hours');
  });

  it('says "at least", "about", or nothing', () => {
    expect(durationWithPrecision(375, 'at_least')).toBe('at least 6 hours 15 minutes');
    expect(durationWithPrecision(45, 'about')).toBe('about 45 minutes');
    expect(durationWithPrecision(83, 'exact')).toBe('1 hour 23 minutes');
  });

  it('writes the Report headline, the "not counted" note, and the letter sentence', () => {
    // 5 pickups at "an hour or more" (5 x 60 = 300) + rides home 60 + 15 = 375 minutes.
    const s = stats([
      log({ pickupStatus: 'late', minutesLate: 60 }),
      log({ pickupStatus: 'late', minutesLate: 60 }),
      log({ pickupStatus: 'late', minutesLate: 60 }),
      log({ pickupStatus: 'late', minutesLate: 60, returnRideStatus: 'late', returnMinutesLate: 60 }),
      log({ pickupStatus: 'late', minutesLate: 60, returnRideStatus: 'late', returnMinutesLate: 15 }),
      log({ pickupStatus: 'never_came', appointmentOutcome: 'missed', returnRideStatus: 'not_needed' }),
    ]);
    expect(timeLostHeadline(s)).toBe('At least 6 hours 15 minutes spent waiting');
    expect(timeLostNotCounted(s)).toBe('Not counted: 1 time a ride never came (no wait time was recorded).');
    expect(timeLostLetterSentence(s)).toBe(
      'In total, I spent at least 6 hours 15 minutes waiting for late rides, not counting the time a ride never came at all.',
    );
  });

  it('says nothing when there was no waiting', () => {
    const s = stats([log({})]);
    expect(timeLostHeadline(s)).toBe('');
    expect(timeLostLetterSentence(s)).toBe('');
    expect(timeLostNotCounted(s)).toBe('');
  });
});

describe('Report, PDF, and letter all say the same thing', () => {
  // Rosa's demo month.
  const period = findPeriod(reportPeriods(DEMO_TODAY, DEMO_RIDE_LOGS), 'past-month');
  const s = computeStats(DEMO_RIDE_LOGS, period.from, period.to);

  it('Rosa waited at least 3 hours, with 3 never-came rides not counted', () => {
    // Pickups: 15 + 30 + 15 + 60 + 30 = 150, plus one ride home 30 late = 180 minutes.
    expect(timeLostHeadline(s)).toBe('At least 3 hours spent waiting');
    expect(timeLostNotCounted(s)).toBe('Not counted: 3 times a ride never came (no wait time was recorded).');
  });

  it('the letter and the PDF contain the same total as the Report', () => {
    const letter = buildComplaintLetter({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, period, today: DEMO_TODAY, stateRule: getStateRule('WA') });
    expect(letter).toContain('In total, I spent at least 3 hours waiting for late rides, not counting the 3 times a ride never came at all.');

    const pdf = buildReportPdf({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, period, today: DEMO_TODAY, chartImage: null });
    // Pull the visible text out of the PDF: each line is stored as "(text) Tj".
    // Long sentences wrap onto several lines, so join them back together.
    // PDFs also write "(" and ")" inside text as "\(" and "\)", so undo that too.
    const pdfText = [...pdf.doc.output().matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)]
      .map((m) => m[1].replace(/\\([()\\])/g, '$1'))
      .join(' ');
    expect(pdfText).toContain(`${timeLostHeadline(s)}.`);
    expect(pdfText).toContain(timeLostNotCounted(s));
  });
});

describe('the new "How late was the ride home?" question', () => {
  const details = { id: 'x', appointmentId: 'a', clinicName: 'C', appointmentType: 'dialysis' as const, rideDate: '2026-10-05', recordedAt: '' };

  it('only appears when the ride home was late', () => {
    expect(stepsFor({ returnRideStatus: 'on_time', notes: '' })).not.toContain('returnHowLate');
    expect(nextStep('returnRide', { returnRideStatus: 'late', notes: '' })).toBe('returnHowLate');
    expect(nextStep('returnHowLate', { returnRideStatus: 'late', notes: '' })).toBe('notes');
  });

  it('is saved, and dropped if the answer changes to on time', () => {
    const base = { pickupStatus: 'on_time' as const, appointmentOutcome: 'made_it' as const, notes: '', returnMinutesLate: 30 as const };
    expect(buildRideLog({ ...base, returnRideStatus: 'late' }, details).returnMinutesLate).toBe(30);
    expect(buildRideLog({ ...base, returnRideStatus: 'on_time' }, details).returnMinutesLate).toBeNull();
  });
});

describe('backups keep the new ride fields', () => {
  const file = (rideLogs: unknown[]) => JSON.stringify({ format: 'rideproof-backup', version: 1, exportedAt: '', profile: DEMO_PROFILE, appointments: [], rideLogs });

  it('restores them', () => {
    const restored = parseBackup(file([log({ returnRideStatus: 'late', returnMinutesLate: 30, pickupWaitMinutes: 12, returnWaitMinutes: 40 })]));
    expect(restored.rideLogs[0]).toMatchObject({ returnMinutesLate: 30, pickupWaitMinutes: 12, returnWaitMinutes: 40 });
  });

  it('restores older backups without them', () => {
    const { returnMinutesLate: _a, ...old } = log({ returnRideStatus: 'late' });
    const restored = parseBackup(file([old]));
    expect(restored.rideLogs[0].returnMinutesLate).toBeNull();
    expect(restored.rideLogs[0].pickupWaitMinutes).toBeUndefined();
  });

  it('explains damaged values in plain language', () => {
    expect(() => parseBackup(file([{ ...log({}), returnMinutesLate: 45 }]))).toThrow(BackupError);
    expect(() => parseBackup(file([{ ...log({}), pickupWaitMinutes: -5 }]))).toThrow('damaged wait time');
    expect(() => parseBackup(file([{ ...log({}), returnWaitMinutes: 'two hours' }]))).toThrow('whole number of minutes');
  });
});
