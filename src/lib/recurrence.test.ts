// Tests for recurring appointments and date helpers. Run with: npm test
import { describe, expect, it } from 'vitest';
import { addDays, formatTime, weekdayOf } from './dates';
import { appointmentDates, describeSchedule, isPastAppointment, tripsBetween, upcomingTrips } from './recurrence';
import type { Appointment } from '../types';

function makeAppointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'a',
    date: '2026-09-28',
    time: '09:00',
    clinicName: 'Test Clinic',
    clinicAddress: '',
    type: 'dialysis',
    recurrence: { kind: 'none' },
    rideBooked: true,
    confirmationNumber: '',
    ...overrides,
  };
}

describe('date helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
  });

  it('finds the weekday', () => {
    expect(weekdayOf('2026-10-30')).toBe(5); // Friday
    expect(weekdayOf('2026-11-01')).toBe(0); // Sunday
  });

  it('formats times in 12-hour style', () => {
    expect(formatTime('09:00')).toBe('9:00 AM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('14:30')).toBe('2:30 PM');
  });
});

describe('appointmentDates', () => {
  it('returns a one-time appointment only if it is in range', () => {
    const appt = makeAppointment({ date: '2026-11-05' });
    expect(appointmentDates(appt, '2026-11-01', '2026-11-30')).toEqual(['2026-11-05']);
    expect(appointmentDates(appt, '2026-11-06', '2026-11-30')).toEqual([]);
    // Range edges count.
    expect(appointmentDates(appt, '2026-11-05', '2026-11-05')).toEqual(['2026-11-05']);
  });

  it('generates Mon/Wed/Fri dates for a weekly appointment', () => {
    const appt = makeAppointment({ recurrence: { kind: 'weekly', weekdays: [1, 3, 5] } });
    // Sept 29 – Oct 28, 2026: the demo story's month. It has 13 Mon/Wed/Fri days.
    const dates = appointmentDates(appt, '2026-09-29', '2026-10-28');
    expect(dates).toHaveLength(13);
    expect(dates[0]).toBe('2026-09-30'); // first Wednesday
    expect(dates[dates.length - 1]).toBe('2026-10-28');
    expect(dates.every((d) => [1, 3, 5].includes(weekdayOf(d)))).toBe(true);
  });

  it('never returns dates before the start date', () => {
    const appt = makeAppointment({ date: '2026-10-14', recurrence: { kind: 'weekly', weekdays: [1, 3, 5] } });
    const dates = appointmentDates(appt, '2026-10-01', '2026-10-19');
    expect(dates).toEqual(['2026-10-14', '2026-10-16', '2026-10-19']);
  });

  it('starts on the next matching weekday if the start date is not one', () => {
    // Oct 13, 2026 is a Tuesday; the rule is Thursdays only.
    const appt = makeAppointment({ date: '2026-10-13', recurrence: { kind: 'weekly', weekdays: [4] } });
    expect(appointmentDates(appt, '2026-10-01', '2026-10-31')).toEqual(['2026-10-15', '2026-10-22', '2026-10-29']);
  });

  it('works across a month change and a daylight-saving change (Nov 1, 2026)', () => {
    const appt = makeAppointment({ recurrence: { kind: 'weekly', weekdays: [0, 1] } });
    expect(appointmentDates(appt, '2026-10-30', '2026-11-03')).toEqual(['2026-11-01', '2026-11-02']);
  });

  it('returns nothing for a weekly rule with no days', () => {
    const appt = makeAppointment({ recurrence: { kind: 'weekly', weekdays: [] } });
    expect(appointmentDates(appt, '2026-10-01', '2026-10-31')).toEqual([]);
  });
});

describe('tripsBetween / upcomingTrips', () => {
  const dialysis = makeAppointment({ id: 'dialysis', recurrence: { kind: 'weekly', weekdays: [1, 3, 5] } });
  const cardiology = makeAppointment({ id: 'cardio', date: '2026-11-04', time: '08:00', type: 'specialist' });

  it('sorts trips by date, then by time on the same day', () => {
    const trips = tripsBetween([dialysis, cardiology], '2026-11-02', '2026-11-04');
    expect(trips.map((t) => `${t.date} ${t.appointment.id}`)).toEqual([
      '2026-11-02 dialysis',
      '2026-11-04 cardio', // 8:00 AM comes before 9:00 AM
      '2026-11-04 dialysis',
    ]);
  });

  it('includes today in upcoming trips', () => {
    const trips = upcomingTrips([dialysis], '2026-10-30');
    expect(trips[0].date).toBe('2026-10-30');
  });
});

describe('describeSchedule', () => {
  it('describes one-time and weekly appointments in plain language', () => {
    expect(describeSchedule(makeAppointment({ date: '2026-11-05', time: '14:30' }))).toBe(
      'Thursday, November 5 at 2:30 PM',
    );
    // Days are listed Monday-first even if picked in a different order.
    expect(describeSchedule(makeAppointment({ recurrence: { kind: 'weekly', weekdays: [5, 1, 3] } }))).toBe(
      'Every Mon, Wed, Fri at 9:00 AM',
    );
  });
});

describe('isPastAppointment', () => {
  it('only one-time appointments before today are past', () => {
    expect(isPastAppointment(makeAppointment({ date: '2026-10-01' }), '2026-10-30')).toBe(true);
    expect(isPastAppointment(makeAppointment({ date: '2026-10-30' }), '2026-10-30')).toBe(false);
    const weekly = makeAppointment({ date: '2026-01-01', recurrence: { kind: 'weekly', weekdays: [1] } });
    expect(isPastAppointment(weekly, '2026-10-30')).toBe(false);
  });
});
