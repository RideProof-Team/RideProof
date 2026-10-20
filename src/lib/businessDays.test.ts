// Tests for business-day deadlines and booking reminders. Run with: npm test
import { describe, expect, it } from 'vitest';
import { bookingDeadline, federalHolidays, isBusinessDay, isFederalHoliday } from './businessDays';
import { bookingReminders, reminderText } from './reminders';
import type { Appointment, Profile } from '../types';

describe('federal holidays', () => {
  it('calculates the 2026 holidays, moving weekend holidays to a weekday', () => {
    expect(federalHolidays(2026)).toEqual([
      '2026-01-01', // New Year's Day (Thursday)
      '2026-01-19', // MLK Day
      '2026-02-16', // Washington's Birthday
      '2026-05-25', // Memorial Day
      '2026-06-19', // Juneteenth
      '2026-07-03', // Independence Day is a Saturday -> observed Friday July 3
      '2026-09-07', // Labor Day
      '2026-10-12', // Columbus Day
      '2026-11-11', // Veterans Day
      '2026-11-26', // Thanksgiving
      '2026-12-25', // Christmas
    ]);
  });

  it('handles New Year\'s Day 2028 (a Saturday) being observed on Dec 31, 2027', () => {
    expect(isFederalHoliday('2027-12-31')).toBe(true);
  });

  it('knows weekends and holidays are not business days', () => {
    expect(isBusinessDay('2026-10-30')).toBe(true); // Friday
    expect(isBusinessDay('2026-10-31')).toBe(false); // Saturday
    expect(isBusinessDay('2026-11-01')).toBe(false); // Sunday
    expect(isBusinessDay('2026-11-26')).toBe(false); // Thanksgiving
  });
});

describe('bookingDeadline', () => {
  it('counts back business days within a week', () => {
    expect(bookingDeadline('2026-10-28', 2)).toBe('2026-10-26'); // Wed -> Mon
  });

  it('skips the weekend', () => {
    expect(bookingDeadline('2026-11-02', 2)).toBe('2026-10-29'); // Mon -> previous Thu
    expect(bookingDeadline('2026-11-03', 2)).toBe('2026-10-30'); // Tue -> previous Fri
  });

  it('skips holidays (Thanksgiving)', () => {
    // Mon Nov 30: Fri Nov 27 (1), Thu Nov 26 is Thanksgiving, Wed Nov 25 (2).
    expect(bookingDeadline('2026-11-30', 2)).toBe('2026-11-25');
  });

  it('works with longer windows', () => {
    expect(bookingDeadline('2026-11-06', 5)).toBe('2026-10-30'); // one week of business days
  });
});

describe('bookingReminders', () => {
  const profile: Profile = {
    role: 'caregiver',
    riderFirstName: 'Rosa',
    caregiverName: '',
    state: 'WA',
    rideCompanyName: 'Sample Ride Co.',
    rideCompanyPhone: '555-0100',
    healthPlanName: '',
  };
  const appt = (overrides: Partial<Appointment>): Appointment => ({
    id: 'a',
    date: '2026-11-03',
    time: '10:30',
    clinicName: 'Clinic',
    clinicAddress: '',
    type: 'specialist',
    recurrence: { kind: 'none' },
    rideBooked: false,
    confirmationNumber: '',
    ...overrides,
  });

  it('marks a reminder "today" when today is the deadline', () => {
    const [reminder] = bookingReminders([appt({})], '2026-10-30', 2);
    expect(reminder).toMatchObject({ tripDate: '2026-11-03', deadline: '2026-10-30', urgency: 'today' });
    expect(reminderText(reminder, profile).title).toBe("Book the ride for Rosa's specialist appointment today");
  });

  it('marks "soon" before the deadline and "overdue" after it', () => {
    expect(bookingReminders([appt({})], '2026-10-27', 2)[0].urgency).toBe('soon');
    expect(bookingReminders([appt({})], '2026-11-02', 2)[0].urgency).toBe('overdue');
  });

  it('ignores booked rides, past appointments, and deadlines far away', () => {
    expect(bookingReminders([appt({ rideBooked: true })], '2026-10-30', 2)).toEqual([]);
    expect(bookingReminders([appt({})], '2026-11-04', 2)).toEqual([]);
    expect(bookingReminders([appt({ date: '2026-12-15' })], '2026-10-30', 2)).toEqual([]);
  });

  it('gives only one reminder for a repeating appointment (its next trip)', () => {
    const weekly = appt({ date: '2026-10-01', recurrence: { kind: 'weekly', weekdays: [1, 3, 5] } });
    const reminders = bookingReminders([weekly], '2026-10-30', 2);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].tripDate).toBe('2026-10-30'); // today's trip: deadline already passed
    expect(reminders[0].urgency).toBe('overdue');
  });

  it('sorts the most urgent first', () => {
    const later = appt({ id: 'later', date: '2026-11-06' });
    const sooner = appt({ id: 'sooner', date: '2026-11-03' });
    expect(bookingReminders([later, sooner], '2026-10-30', 2).map((r) => r.appointment.id)).toEqual(['sooner', 'later']);
  });
});
