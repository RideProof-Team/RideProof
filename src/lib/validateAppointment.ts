// Checks the appointment form before saving. Returns plain-language problems.
import type { Appointment } from '../types';
import { t } from './i18n';

export type AppointmentErrors = Partial<Record<'date' | 'time' | 'clinicName' | 'weekdays', string>>;

export function validateAppointment(appointment: Appointment): AppointmentErrors {
  const errors: AppointmentErrors = {};
  // The date and time boxes give us "YYYY-MM-DD" and "HH:MM" (or '' if empty).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment.date)) {
    errors.date = t('Please choose a date.');
  }
  if (!/^\d{2}:\d{2}$/.test(appointment.time)) {
    errors.time = t('Please choose a time.');
  }
  if (appointment.clinicName.trim() === '') {
    errors.clinicName = t('Please enter the clinic name.');
  }
  if (appointment.recurrence.kind === 'weekly' && appointment.recurrence.weekdays.length === 0) {
    errors.weekdays = t('Please choose at least one day of the week.');
  }
  return errors;
}
