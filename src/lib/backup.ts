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
//
// Not included on purpose: running "Where's my ride?" timers. A timer
// restored on another phone days later would show a meaningless wait. When
// a wait ends, its minutes are saved in the ride log, which IS backed up.
//
// Version history of the file:
//   1: profile, appointments, rideLogs
//   2: + complaints (the complaint follow-up tracker). A version 1 file
//      still loads; it just has no complaints.
//   3: + bookingAttempts (failed booking calls), and the optional profile
//      fields mobilityNeeds and homeAddress. Older files load with none.
// ---------------------------------------------------------------------------
import type { Appointment, FailedBooking, Profile, RideLog, SentComplaint } from '../types';
import { FAIL_REASONS } from './bookingAttempts';
import { COMPLAINT_METHODS, COMPLAINT_STATUSES } from './complaints';
import { formatDateInSentence } from './dates';
import { isValidRiderBookingWindow } from './bookingWindow';
import type { Storage } from './storage';

// Keep the original identifier so backups created before the rename still import.
export const BACKUP_FORMAT = 'rideproof-backup';
export const BACKUP_VERSION = 3;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  profile: Profile;
  appointments: Appointment[];
  rideLogs: RideLog[];
  complaints: SentComplaint[];
  bookingAttempts: FailedBooking[];
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
    complaints: await storage.listComplaints(),
    bookingAttempts: await storage.listBookingAttempts(),
  };
}

export function backupFileName(today: string): string {
  return `RideConnect-backup-${today}.json`;
}

// ----- Checking a loaded file -----

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MOBILITY_NEEDS = ['none', 'walker', 'wheelchair', 'needs_help'] as const;
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
  if (v.mobilityNeeds !== undefined && !oneOf(v.mobilityNeeds, MOBILITY_NEEDS)) {
    throw new BackupError('The mobility needs setting in this file is damaged. It must be none, walker, wheelchair, or needs help.');
  }
  if (v.homeAddress !== undefined && typeof v.homeAddress !== 'string') {
    throw new BackupError('The home address in this file is damaged.');
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
    ...(oneOf(v.mobilityNeeds, MOBILITY_NEEDS) ? { mobilityNeeds: v.mobilityNeeds } : {}),
    ...(text(v.homeAddress).trim() ? { homeAddress: text(v.homeAddress).trim() } : {}),
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
  // Added later (optional): the pickup time the ride company gave.
  if (v.pickupTime !== undefined && v.pickupTime !== '' && !TIME.test(text(v.pickupTime))) {
    throw new BackupError(`The pickup time for the appointment at ${text(v.clinicName) || 'a clinic'} is damaged. It must look like 08:15.`);
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
    ...(TIME.test(text(v.pickupTime)) ? { pickupTime: text(v.pickupTime) } : {}),
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

function readComplaint(v: unknown): SentComplaint {
  if (!isObject(v) || !text(v.id) || !DATE.test(text(v.sentDate))) {
    throw new BackupError('A complaint record in this file is damaged.');
  }
  const when = `The complaint sent on ${formatDateInSentence(text(v.sentDate))}`;
  if (!text(v.sentTo).trim()) throw new BackupError(`${when} is missing who it was sent to.`);
  if (!oneOf(v.method, COMPLAINT_METHODS)) {
    throw new BackupError(`${when} has a damaged "how it was sent" answer. It must be email, mail, phone call, or online form.`);
  }
  if (!oneOf(v.status, COMPLAINT_STATUSES)) {
    throw new BackupError(`${when} has a damaged status. It must be Waiting, Got an answer, Problem fixed, or Not fixed.`);
  }
  for (const field of ['statusChangedOn', 'remindOn'] as const) {
    if (v[field] !== undefined && !DATE.test(text(v[field]))) throw new BackupError(`${when} has a damaged date.`);
  }
  return {
    id: text(v.id),
    sentDate: text(v.sentDate),
    sentTo: text(v.sentTo).trim(),
    method: v.method,
    referenceNumber: text(v.referenceNumber),
    status: v.status,
    notes: text(v.notes),
    ...(DATE.test(text(v.statusChangedOn)) ? { statusChangedOn: text(v.statusChangedOn) } : {}),
    ...(DATE.test(text(v.remindOn)) ? { remindOn: text(v.remindOn) } : {}),
    ...(text(v.followUpOf) ? { followUpOf: text(v.followUpOf) } : {}),
  };
}

function readBookingAttempt(v: unknown): FailedBooking {
  const types = ['dialysis', 'checkup', 'specialist', 'therapy', 'other'] as const;
  if (!isObject(v) || !text(v.id) || !text(v.appointmentId) || !DATE.test(text(v.tripDate)) || !DATE.test(text(v.attemptedOn))) {
    throw new BackupError('A record of a booking call in this file is damaged.');
  }
  if (!oneOf(v.reason, FAIL_REASONS)) {
    throw new BackupError(
      `The booking call on ${formatDateInSentence(text(v.attemptedOn))} has a damaged reason. It must be "couldn't get through", "no rides available", "too late to book", or "something else".`,
    );
  }
  return {
    id: text(v.id),
    appointmentId: text(v.appointmentId),
    tripDate: text(v.tripDate),
    clinicName: text(v.clinicName),
    appointmentType: oneOf(v.appointmentType, types) ? v.appointmentType : 'other',
    attemptedOn: text(v.attemptedOn),
    recordedAt: text(v.recordedAt),
    reason: v.reason,
    details: text(v.details),
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
  // Complaints were added in version 2. Older files don't have them: start with none.
  if (data.complaints !== undefined && !Array.isArray(data.complaints)) {
    throw new BackupError('The complaints in this backup file are damaged.');
  }
  // Booking calls were added in version 3.
  if (data.bookingAttempts !== undefined && !Array.isArray(data.bookingAttempts)) {
    throw new BackupError('The booking calls in this backup file are damaged.');
  }
  return {
    format: BACKUP_FORMAT,
    version: data.version,
    exportedAt: text(data.exportedAt),
    profile: readProfile(data.profile),
    appointments: data.appointments.map(readAppointment),
    rideLogs: data.rideLogs.map(readRideLog),
    complaints: Array.isArray(data.complaints) ? data.complaints.map(readComplaint) : [],
    bookingAttempts: Array.isArray(data.bookingAttempts) ? data.bookingAttempts.map(readBookingAttempt) : [],
  };
}

/** Replace everything in (real) storage with the backup's contents. */
export async function restoreBackup(storage: Storage, backup: BackupFile) {
  if (storage.mode !== 'real') throw new BackupError('Backups can only be restored outside demo mode.');
  await storage.clearAll();
  await storage.saveProfile(backup.profile);
  for (const appointment of backup.appointments) await storage.saveAppointment(appointment);
  for (const log of backup.rideLogs) await storage.saveRideLog(log);
  for (const complaint of backup.complaints) await storage.saveComplaint(complaint);
  for (const attempt of backup.bookingAttempts) await storage.saveBookingAttempt(attempt);
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
