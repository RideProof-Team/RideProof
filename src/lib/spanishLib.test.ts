// Tests for the Spanish wording made in src/lib. Run with: npm test
// English output is checked by each file's own tests; this checks that
// the same functions speak natural Spanish when the app is in Spanish.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackupError, parseBackup } from './backup';
import { businessDaysText } from './bookingWindow';
import { applyLanguage, t, withLanguage } from './i18n';
import { APPOINTMENT_TYPE_LABELS, MINUTES_LATE_LABELS, OUTCOME_LABELS, PICKUP_LABELS, RETURN_LABELS, WEEKDAY_NAMES } from './labels';
import { describeSchedule } from './recurrence';
import { reminderText, type BookingReminder } from './reminders';
import { computeStats, headline, reportPeriods, type RideStats } from './reportStats';
import { HISTORY_FILTER_LABELS, SEVERITY_DISPLAY, severityReason } from './rideStatus';
import { durationWithPrecision, formatDuration, timeLostHeadline, timeLostLetterSentence, timeLostNotCounted } from './timeLost';
import { validateAppointment } from './validateAppointment';
import { validateProfile } from './validateProfile';
import { promptText, startWait } from './waitTimer';
import type { Appointment, Profile, RideLog } from '../types';

beforeEach(() => applyLanguage('es'));
afterEach(() => applyLanguage('en'));

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

const rider: Profile = {
  role: 'rider',
  riderFirstName: 'Rosa',
  caregiverName: '',
  state: 'WA',
  rideCompanyName: 'Sample Ride Co.',
  rideCompanyPhone: '555-0100',
  healthPlanName: '',
};
const caregiver: Profile = { ...rider, role: 'caregiver', caregiverName: 'Ana' };

const appointment: Appointment = {
  id: 'a',
  date: '2026-11-03',
  time: '10:30',
  clinicName: 'Sample Clinic',
  clinicAddress: '',
  type: 'dialysis',
  recurrence: { kind: 'none' },
  rideBooked: false,
  confirmationNumber: '',
};

const stats = (overrides: Partial<RideStats>) => ({ ...computeStats([], '2026-10-01', '2026-10-31'), ...overrides });

describe('report headline in Spanish', () => {
  it('handles one and many', () => {
    expect(headline(stats({}))).toBe('No hay viajes registrados en este período.');
    expect(headline(stats({ totalRides: 13, latePickups: 5, noShows: 2 }))).toBe(
      '7 de 13 viajes tuvieron un problema: 5 llegaron tarde y 2 nunca llegaron.',
    );
    expect(headline(stats({ totalRides: 13, noShows: 1 }))).toBe('1 de 13 viajes tuvo un problema: 1 nunca llegó.');
    expect(headline(stats({ totalRides: 1, latePickups: 1 }))).toBe('1 de 1 viaje tuvo un problema: 1 llegó tarde.');
    expect(headline(stats({ totalRides: 4 }))).toBe('Los 4 viajes llegaron a tiempo.');
  });

  it('labels the "past month" period', () => {
    expect(reportPeriods('2026-10-30', [])[0].label).toBe('Último mes (30 sept – 30 oct)');
  });
});

describe('time lost in Spanish', () => {
  it('writes durations naturally', () => {
    expect(formatDuration(220)).toBe('3 horas y 40 minutos');
    expect(formatDuration(61)).toBe('1 hora y 1 minuto');
    expect(formatDuration(120)).toBe('2 horas');
    expect(durationWithPrecision(45, 'about')).toBe('aproximadamente 45 minutos');
  });

  it('says "at least" and what was not counted', () => {
    const wait = { waitMinutes: 220, waitPrecision: 'at_least' as const, untimedNeverCame: 2, untimedLate: 1 };
    expect(timeLostHeadline(wait)).toBe('Al menos 3 horas y 40 minutos de espera');
    expect(timeLostNotCounted(wait)).toBe(
      'Sin contar: 2 veces en que un viaje nunca llegó y 1 viaje de regreso con retraso sin tiempo anotado (no se anotó el tiempo de espera).',
    );
    expect(timeLostLetterSentence({ ...wait, untimedNeverCame: 1 })).toBe(
      'En total, pasé al menos 3 horas y 40 minutos esperando viajes que llegaron tarde, sin contar la vez en que un viaje nunca llegó.',
    );
  });

  it('can still write English for a letter', () => {
    const wait = { waitMinutes: 220, waitPrecision: 'about' as const, untimedNeverCame: 0, untimedLate: 0 };
    expect(withLanguage('en', () => timeLostHeadline(wait))).toBe('About 3 hours 40 minutes spent waiting');
  });
});

describe('booking reminders in Spanish', () => {
  const reminder = (urgency: BookingReminder['urgency']): BookingReminder => ({
    appointment,
    tripDate: '2026-11-03',
    deadline: '2026-10-30',
    urgency,
  });

  it('writes the title and body', () => {
    expect(reminderText(reminder('soon'), rider)).toEqual({
      title: 'Reserve el viaje para su cita de diálisis',
      body: 'La cita es el martes, 3 de noviembre a las 10:30 a. m., en Sample Clinic. Reserve el viaje a más tardar el viernes, 30 de octubre.',
    });
    expect(reminderText(reminder('overdue'), caregiver).title).toBe('Reserve ahora el viaje para la cita de diálisis de Rosa');
    expect(reminderText({ ...reminder('today'), appointment: { ...appointment, type: 'other' } }, rider).title).toBe(
      'Reserve hoy el viaje para su cita',
    );
  });

  it('says "a la 1" for one o\'clock', () => {
    const one = { ...reminder('today'), appointment: { ...appointment, time: '13:15' } };
    expect(reminderText(one, rider).body).toContain('a la 1:15 p. m.');
    expect(describeSchedule({ ...appointment, time: '13:15' })).toBe('Martes, 3 de noviembre a la 1:15 p. m.');
  });

  it('describes weekly schedules', () => {
    expect(describeSchedule({ ...appointment, time: '09:00', recurrence: { kind: 'weekly', weekdays: [5, 1, 3] } })).toBe(
      'Cada lun, mié y vie a las 9:00 a. m.',
    );
  });

  it('says "business days"', () => {
    expect(businessDaysText(1)).toBe('1 día hábil');
    expect(businessDaysText(3)).toBe('3 días hábiles');
  });
});

describe('wait timer prompts in Spanish', () => {
  it('asks gently, then firmly', () => {
    const wait = startWait({ ...appointment, pickupTime: '09:00' }, '2026-11-03', 'pickup', new Date(2026, 10, 3, 9, 0));
    expect(promptText(wait, 15, 'Sample Ride Co.')).toEqual({
      title: 'Su transporte lleva 15 minutos de retraso',
      body: 'Puede llamar a Sample Ride Co. y preguntar dónde está el vehículo. Anote con quién habla.',
    });
    expect(promptText({ ...wait, leg: 'return' }, 30, 'Sample Ride Co.').title).toBe(
      'Lleva 30 minutos esperando su viaje de regreso',
    );
  });
});

describe('errors in Spanish', () => {
  it('explains a bad backup file in plain words', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
    expect(() => parseBackup('not json')).toThrow('Este archivo no es una copia de seguridad de RideConnect.');
    const newer = JSON.stringify({ format: 'rideproof-backup', version: 99 });
    expect(() => parseBackup(newer)).toThrow('Actualice la aplicación e inténtelo de nuevo.');
  });

  it('explains form problems', () => {
    expect(validateProfile({ ...rider, riderFirstName: ' ' }).riderFirstName).toBe('Por favor, escriba un nombre.');
    expect(validateAppointment({ ...appointment, clinicName: '' }).clinicName).toBe('Por favor, escriba el nombre de la clínica.');
  });
});

describe('labels in Spanish', () => {
  it('has Spanish for every label list', () => {
    expect(t(PICKUP_LABELS.on_time)).toBe('A tiempo');
    expect(t(PICKUP_LABELS.never_came)).toBe('Nunca llegó');
    expect(t(MINUTES_LATE_LABELS[60])).toBe('Una hora o más');
    expect(t(OUTCOME_LABELS.missed)).toBe('Perdió la cita');
    expect(t(RETURN_LABELS.not_needed)).toBe('No hizo falta');
    expect(t(APPOINTMENT_TYPE_LABELS.dialysis)).toBe('Diálisis');
    expect(t(WEEKDAY_NAMES[1])).toBe('lunes');
    expect(t(SEVERITY_DISPLAY.problem.label)).toBe('Problema');
    expect(t(HISTORY_FILTER_LABELS.problems)).toBe('Solo problemas');
    expect(severityReason(log('2026-10-02', { returnRideStatus: 'never_came' }))).toBe('El viaje de regreso nunca llegó');
  });

  it('keeps the English words as they were', () => {
    applyLanguage('en');
    expect(t(PICKUP_LABELS.on_time)).toBe('On time');
    expect(severityReason(log('2026-10-02', { pickupStatus: 'late', minutesLate: 15 }))).toBe('Late pickup');
  });
});

describe('the demo story in Spanish', () => {
  it('writes the demo notes in Spanish when the demo starts in Spanish, and in English otherwise', async () => {
    const { createStorage } = await import('./storage');
    const { resetDemo, DEMO_NOTES_ES, DEMO_RIDE_LOGS } = await import('./demoData');
    const demo = createStorage('demo');
    const english = DEMO_RIDE_LOGS.find((l) => l.rideDate === '2026-10-21')!.notes;

    applyLanguage('es');
    await resetDemo(demo);
    const spanish = (await demo.listRideLogs()).find((l) => l.rideDate === '2026-10-21')!.notes;
    expect(spanish).toBe(DEMO_NOTES_ES[english]);
    expect((await demo.listBookingAttempts())[0].details).toBe('En espera 25 minutos y luego se cortó la llamada.');

    applyLanguage('en');
    await resetDemo(demo);
    expect((await demo.listRideLogs()).find((l) => l.rideDate === '2026-10-21')!.notes).toBe(english);
    // Every note in the story has a Spanish version.
    for (const log of DEMO_RIDE_LOGS) if (log.notes) expect(DEMO_NOTES_ES[log.notes]).toBeTruthy();
  });
});
