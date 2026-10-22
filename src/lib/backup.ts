// ---------------------------------------------------------------------------
// backup.ts — save all RideConnect data to a file, and load it back.
//
// RideConnect keeps data only on this device (no accounts, no server). That's
// great for privacy, but it means a lost phone or cleared browser loses
// everything. A backup file fixes that: the user saves it somewhere safe
// (email it to themselves, save it to Files or Google Drive) and can load
// it on any phone.
//
// The file is JSON: plain text that both people and programs can read.
// When loading, we check every field carefully, because the file came
// from outside the app and could be damaged or not a RideConnect file at all.
// ---------------------------------------------------------------------------
import type { Appointment, Profile, RideLog } from '../types';
import { isValidRiderBookingWindow } from './bookingWindow';
import type { Storage } from './storage';

// Keep the original identifier so backups created before the rename still import.
export const BACKUP_FORMAT = 'rideproof-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  profile: Profile;
  appointments: Appointment[];
  rideLogs: RideLog[];
}

/** A problem with a backup file, explained in plain language. */
export class BackupError extends Error {}

export async function createBackup(storage: Storage, exportedAt: string): Promise<BackupFile> {
  const profile = await storage.getProfile();
  if (!profile) throw new BackupError('There is no data to back up yet.');
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    profile,
    appointments: await storage.listAppointments(),
    rideLogs: await storage.listRideLogs(),
  };
}

export function backupFileName(today: string): string {
  return `RideConnect-backup-${today}.json`;
}

// ----- Checking a loaded file -----

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const oneOf = <T extends string | number>(v: unknown, allowed: readonly T[]): v is T => allowed.includes(v as T);

function readProfile(v: unknown): Profile {
  if (!isObject(v) || !oneOf(v.role, ['rider', 'caregiver'] as const) || !text(v.riderFirstName)) {
    throw new BackupError('The rider information in this file is missing or damaged.');
  }
  // Added later: older backups don't have it, and that's fine (left unset).
  if (v.riderBookingWindow !== undefined && v.riderBookingWindow !== null && !isValidRiderBookingWindow(v.riderBookingWindow)) {
    throw new BackupError('The booking reminder setting in this file is damaged. It must be a number of business days from 1 to 14, or "Not sure".');
  }
  return {
    role: v.role,
    riderFirstName: text(v.riderFirstName),
    caregiverName: text(v.caregiverName),
    state: text(v.state),
    rideCompanyName: text(v.rideCompanyName),
    rideCompanyPhone: text(v.rideCompanyPhone),
    healthPlanName: text(v.healthPlanName),
    ...(isValidRiderBookingWindow(v.riderBookingWindow) ? { riderBookingWindow: v.riderBookingWindow } : {}),
  };
}

function readAppointment(v: unknown): Appointment {
  const types = ['dialysis', 'checkup', 'specialist', 'therapy', 'other'] as const;
  if (
    !isObject(v) || !text(v.id) || !DATE.test(text(v.date)) || !TIME.test(text(v.time)) ||
    !oneOf(v.type, types) || !isObject(v.recurrence)
  ) {
    throw new BackupError('An appointment in this file is damaged.');
  }
  const rule = v.recurrence;
  const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays.filter((d) => oneOf(d, [0, 1, 2, 3, 4, 5, 6] as const)) : [];
  return {
    id: text(v.id),
    date: text(v.date),
    time: text(v.time),
    clinicName: text(v.clinicName),
    clinicAddress: text(v.clinicAddress),
    clinicPhone: text(v.clinicPhone),
    type: v.type,
    recurrence: rule.kind === 'weekly' ? { kind: 'weekly', weekdays } : { kind: 'none' },
    rideBooked: v.rideBooked === true,
    confirmationNumber: text(v.confirmationNumber),
    skippedDates: Array.isArray(v.skippedDates) ? v.skippedDates.filter((d) => DATE.test(text(d))) : [],
  };
}

function readRideLog(v: unknown): RideLog {
  const types = ['dialysis', 'checkup', 'specialist', 'therapy', 'other'] as const;
  if (
    !isObject(v) || !text(v.id) || !text(v.appointmentId) || !DATE.test(text(v.rideDate)) ||
    !oneOf(v.pickupStatus, ['on_time', 'late', 'never_came'] as const) ||
    !oneOf(v.appointmentOutcome, ['made_it', 'late', 'missed'] as const) ||
    !oneOf(v.returnRideStatus, ['on_time', 'late', 'never_came', 'not_needed'] as const)
  ) {
    throw new BackupError('A ride record in this file is damaged.');
  }
  // Fields added later. Older backups don't have them (that's fine), but if
  // they're present they must make sense.
  if (v.returnMinutesLate !== undefined && v.returnMinutesLate !== null && !oneOf(v.returnMinutesLate, [15, 30, 60] as const)) {
    throw new BackupError(`The ride record for ${text(v.rideDate)} has a damaged "how late was the ride home" answer.`);
  }
  for (const field of ['pickupWaitMinutes', 'returnWaitMinutes'] as const) {
    if (v[field] !== undefined && !isWaitMinutes(v[field])) {
      throw new BackupError(`The ride record for ${text(v.rideDate)} has a damaged wait time. It must be a whole number of minutes.`);
    }
  }
  return {
    id: text(v.id),
    appointmentId: text(v.appointmentId),
    clinicName: text(v.clinicName),
    appointmentType: oneOf(v.appointmentType, types) ? v.appointmentType : 'other',
    rideDate: text(v.rideDate),
    pickupStatus: v.pickupStatus,
    minutesLate: oneOf(v.minutesLate, [15, 30, 60] as const) ? v.minutesLate : null,
    appointmentOutcome: v.appointmentOutcome,
    returnRideStatus: v.returnRideStatus,
    notes: text(v.notes),
    recordedAt: text(v.recordedAt),
    scheduledPickup: TIME.test(text(v.scheduledPickup)) ? text(v.scheduledPickup) : undefined,
    actualPickup: TIME.test(text(v.actualPickup)) ? text(v.actualPickup) : undefined,
    returnMinutesLate: oneOf(v.returnMinutesLate, [15, 30, 60] as const) ? v.returnMinutesLate : null,
    ...(isWaitMinutes(v.pickupWaitMinutes) ? { pickupWaitMinutes: v.pickupWaitMinutes } : {}),
    ...(isWaitMinutes(v.returnWaitMinutes) ? { returnWaitMinutes: v.returnWaitMinutes } : {}),
  };
}

/** A measured wait: a whole number of minutes, from 0 up to one day. */
function isWaitMinutes(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 24 * 60;
}

/** Read the text of a backup file. Throws a BackupError if it isn't valid. */
export function parseBackup(fileText: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(fileText);
  } catch {
    throw new BackupError('This file is not a RideConnect backup.');
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT) {
    throw new BackupError('This file is not a RideConnect backup.');
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of RideConnect. Update the app and try again.');
  }
  if (!Array.isArray(data.appointments) || !Array.isArray(data.rideLogs)) {
    throw new BackupError('This backup file is damaged.');
  }
  return {
    format: BACKUP_FORMAT,
    version: data.version,
    exportedAt: text(data.exportedAt),
    profile: readProfile(data.profile),
    appointments: data.appointments.map(readAppointment),
    rideLogs: data.rideLogs.map(readRideLog),
  };
}

/** Replace everything in (real) storage with the backup's contents. */
export async function restoreBackup(storage: Storage, backup: BackupFile) {
  if (storage.mode !== 'real') throw new BackupError('Backups can only be restored outside demo mode.');
  await storage.clearAll();
  await storage.saveProfile(backup.profile);
  for (const appointment of backup.appointments) await storage.saveAppointment(appointment);
  for (const log of backup.rideLogs) await storage.saveRideLog(log);
}

// ----- Remembering when the last backup was made -----
const LAST_BACKUP_KEY = 'rideproof-last-backup';

export function loadLastBackupDate(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function saveLastBackupDate(date: string | null) {
  try {
    if (date) localStorage.setItem(LAST_BACKUP_KEY, date);
    else localStorage.removeItem(LAST_BACKUP_KEY);
  } catch {
    // Not critical.
  }
}
