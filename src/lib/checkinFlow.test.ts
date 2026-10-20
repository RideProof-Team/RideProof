import { describe, expect, it } from 'vitest';
import { buildRideLog, findLog, nextStep, previousStep, stepsFor, tripsNeedingCheckIn } from './checkinFlow';
import { describeProblem, pickupTimesText } from './complaintLetter';
import { filterLogs, rideSeverity } from './rideStatus';
import type { Appointment, RideLog } from '../types';

const details = {
  id: 'log-1',
  appointmentId: 'appt-1',
  clinicName: 'Test Clinic',
  appointmentType: 'dialysis' as const,
  rideDate: '2026-10-30',
  recordedAt: '2026-10-30T15:00:00.000Z',
};

describe('check-in question order', () => {
  it('skips "how late" when the ride was on time', () => {
    expect(stepsFor({ pickupStatus: 'on_time', notes: '' })).toEqual(['pickup', 'outcome', 'returnRide', 'notes']);
    expect(nextStep('pickup', { pickupStatus: 'on_time', notes: '' })).toBe('outcome');
  });

  it('asks "how late" when the ride was late', () => {
    const answers = { pickupStatus: 'late' as const, notes: '' };
    expect(nextStep('pickup', answers)).toBe('howLate');
    expect(nextStep('howLate', answers)).toBe('outcome');
    expect(previousStep('outcome', answers)).toBe('howLate');
  });

  it('ends after the notes step and has nothing before pickup', () => {
    expect(nextStep('notes', { notes: '' })).toBe('done');
    expect(previousStep('pickup', { notes: '' })).toBeNull();
  });
});

describe('buildRideLog', () => {
  it('builds a complete log and trims notes', () => {
    const log = buildRideLog(
      { pickupStatus: 'late', minutesLate: 30, appointmentOutcome: 'late', returnRideStatus: 'on_time', notes: '  hi ' },
      details,
    );
    expect(log).toMatchObject({ pickupStatus: 'late', minutesLate: 30, notes: 'hi', rideDate: '2026-10-30' });
  });

  it('drops an old "how late" answer if pickup was changed to on time', () => {
    const log = buildRideLog(
      { pickupStatus: 'on_time', minutesLate: 60, appointmentOutcome: 'made_it', returnRideStatus: 'on_time', notes: '' },
      details,
    );
    expect(log.minutesLate).toBeNull();
  });

  it('refuses to build a log with unanswered questions', () => {
    expect(() => buildRideLog({ pickupStatus: 'on_time', notes: '' }, details)).toThrow();
  });
});

describe('rideSeverity', () => {
  const base = buildRideLog(
    { pickupStatus: 'on_time', appointmentOutcome: 'made_it', returnRideStatus: 'on_time', notes: '' },
    details,
  );
  it('rates rides as good, late, or problem', () => {
    expect(rideSeverity(base)).toBe('good');
    expect(rideSeverity({ ...base, pickupStatus: 'late', minutesLate: 15 })).toBe('late');
    expect(rideSeverity({ ...base, returnRideStatus: 'late' })).toBe('late');
    expect(rideSeverity({ ...base, pickupStatus: 'never_came' })).toBe('problem');
    expect(rideSeverity({ ...base, appointmentOutcome: 'missed' })).toBe('problem');
    expect(rideSeverity({ ...base, returnRideStatus: 'never_came' })).toBe('problem');
    expect(rideSeverity({ ...base, returnRideStatus: 'not_needed' })).toBe('good');
  });
});

describe('tripsNeedingCheckIn', () => {
  const dialysis: Appointment = {
    id: 'appt-1',
    date: '2026-10-01',
    time: '09:00',
    clinicName: 'Test Clinic',
    clinicAddress: '',
    type: 'dialysis',
    recurrence: { kind: 'weekly', weekdays: [1, 3, 5] },
    rideBooked: true,
    confirmationNumber: '',
  };
  const logged: RideLog = buildRideLog(
    { pickupStatus: 'on_time', appointmentOutcome: 'made_it', returnRideStatus: 'on_time', notes: '' },
    { ...details, rideDate: '2026-10-28' },
  );

  it('lists recent trips without a log, newest first, including today', () => {
    const trips = tripsNeedingCheckIn([dialysis], [logged], '2026-10-30');
    const dates = trips.map((t) => t.date);
    expect(dates[0]).toBe('2026-10-30');
    expect(dates).not.toContain('2026-10-28'); // already logged
    expect(dates).toContain('2026-10-26');
    expect(dates).not.toContain('2026-10-14'); // older than 14 days
  });

  it('finds a log by appointment and date', () => {
    expect(findLog([logged], 'appt-1', '2026-10-28')).toBe(logged);
    expect(findLog([logged], 'appt-1', '2026-10-26')).toBeUndefined();
  });
});

describe('pickup times', () => {
  const answers = {
    pickupStatus: 'late' as const,
    minutesLate: 60 as const,
    appointmentOutcome: 'late' as const,
    returnRideStatus: 'on_time' as const,
    notes: '',
    scheduledPickup: '08:15',
    actualPickup: '09:20',
  };

  it('saves the optional times', () => {
    expect(buildRideLog(answers, details)).toMatchObject({ scheduledPickup: '08:15', actualPickup: '09:20' });
  });

  it('drops "driver came at" when the driver never came, and empty boxes', () => {
    const log = buildRideLog({ ...answers, pickupStatus: 'never_came', scheduledPickup: '' }, details);
    expect(log.actualPickup).toBeUndefined();
    expect(log.scheduledPickup).toBeUndefined();
  });

  it('describes the times in History, the letter, and the PDF', () => {
    const log = buildRideLog(answers, details);
    expect(pickupTimesText(log)).toBe('Scheduled for 8:15 AM; the driver came at 9:20 AM.');
    expect(describeProblem(log)).toBe(
      'Pickup was an hour or more late. I arrived late to my appointment. Pickup was scheduled for 8:15 AM; the driver came at 9:20 AM.',
    );
    expect(pickupTimesText({ ...log, scheduledPickup: undefined })).toBe('The driver came at 9:20 AM.');
    expect(pickupTimesText({ ...log, scheduledPickup: undefined, actualPickup: undefined })).toBe('');
  });
});

describe('History filters', () => {
  const mk = (rideDate: string, extra: Partial<RideLog>) =>
    buildRideLog(
      { pickupStatus: 'on_time', appointmentOutcome: 'made_it', returnRideStatus: 'on_time', notes: '', ...extra } as never,
      { ...details, id: rideDate, rideDate },
    );
  const logs = [
    mk('2026-10-01', {}),
    mk('2026-10-02', { pickupStatus: 'late', minutesLate: 15 }),
    mk('2026-10-03', { pickupStatus: 'never_came', appointmentOutcome: 'missed', returnRideStatus: 'not_needed' }),
    mk('2026-10-04', { returnRideStatus: 'never_came', notes: 'Waited 2 hours for ride home' }),
  ];
  const ids = (list: RideLog[]) => list.map((l) => l.id);

  it('filters by kind of problem', () => {
    expect(ids(filterLogs(logs, 'all', ''))).toHaveLength(4);
    expect(ids(filterLogs(logs, 'problems', ''))).toEqual(['2026-10-02', '2026-10-03', '2026-10-04']);
    expect(ids(filterLogs(logs, 'late', ''))).toEqual(['2026-10-02']);
    expect(ids(filterLogs(logs, 'never_came', ''))).toEqual(['2026-10-03', '2026-10-04']);
  });

  it('searches notes and clinic names, ignoring case', () => {
    expect(ids(filterLogs(logs, 'all', 'WAITED'))).toEqual(['2026-10-04']);
    expect(ids(filterLogs(logs, 'all', 'test clinic'))).toHaveLength(4);
    expect(ids(filterLogs(logs, 'late', 'waited'))).toEqual([]);
  });
});
