// ---------------------------------------------------------------------------
// storage.ts — saves and loads all of RideProof's data on the device.
//
// We use IndexedDB, a database built into every modern browser. Data stays
// on this phone/computer only; nothing is ever sent over the internet.
// The `idb` library wraps IndexedDB so we can use simple async/await code.
//
// KEY IDEA: real data and demo data live in two COMPLETELY SEPARATE
// databases ("rideproof-real" and "rideproof-demo"). The rest of the app
// asks for a Storage object for one mode, and that object can only ever
// touch its own database. This makes it impossible for demo mode to
// change, delete, or mix with the user's real data.
// ---------------------------------------------------------------------------
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Appointment, Profile, RideLog } from '../types';

export type DataMode = 'real' | 'demo';

/** The database name for each mode. Two names = two separate databases. */
export const DB_NAMES: Record<DataMode, string> = {
  real: 'rideproof-real',
  demo: 'rideproof-demo',
};

// Bump this number whenever the database layout below changes.
const DB_VERSION = 1;

// The profile is stored under this one fixed key, since there's only one.
const PROFILE_KEY = 'profile';

/** Describes the database layout ("object stores" are like tables). */
interface RideProofDB extends DBSchema {
  profile: { key: string; value: Profile };
  appointments: { key: string; value: Appointment };
  rideLogs: { key: string; value: RideLog };
}

// Opening a database takes time, so we remember the open connection for
// each mode and reuse it instead of reopening it on every save.
const openDatabases = new Map<DataMode, Promise<IDBPDatabase<RideProofDB>>>();

function getDb(mode: DataMode): Promise<IDBPDatabase<RideProofDB>> {
  let db = openDatabases.get(mode);
  if (!db) {
    db = openDB<RideProofDB>(DB_NAMES[mode], DB_VERSION, {
      // upgrade() runs only the first time the database is created
      // (or when DB_VERSION goes up). It creates the "tables".
      upgrade(database) {
        database.createObjectStore('profile');
        database.createObjectStore('appointments', { keyPath: 'id' });
        database.createObjectStore('rideLogs', { keyPath: 'id' });
      },
    });
    const opening = db;
    void opening.catch(() => {
      if (openDatabases.get(mode) === opening) openDatabases.delete(mode);
    });
    openDatabases.set(mode, db);
  }
  return db;
}

/** Everything the app can do with stored data, for one mode. */
export interface Storage {
  mode: DataMode;
  getProfile(): Promise<Profile | undefined>;
  saveProfile(profile: Profile): Promise<void>;
  listAppointments(): Promise<Appointment[]>;
  saveAppointment(appointment: Appointment): Promise<void>;
  deleteAppointment(id: string): Promise<void>;
  listRideLogs(): Promise<RideLog[]>;
  saveRideLog(log: RideLog): Promise<void>;
  deleteRideLog(id: string): Promise<void>;
  /** Erase everything in THIS mode's database only. */
  clearAll(): Promise<void>;
}

/**
 * Create a Storage object for one mode. Every function inside uses
 * getDb(mode), so a 'demo' storage can never read or write real data.
 */
export function createStorage(mode: DataMode): Storage {
  return {
    mode,

    async getProfile() {
      return (await getDb(mode)).get('profile', PROFILE_KEY);
    },
    async saveProfile(profile) {
      await (await getDb(mode)).put('profile', profile, PROFILE_KEY);
    },

    async listAppointments() {
      return (await getDb(mode)).getAll('appointments');
    },
    async saveAppointment(appointment) {
      // put() adds a new record, or replaces one with the same id.
      await (await getDb(mode)).put('appointments', appointment);
    },
    async deleteAppointment(id) {
      await (await getDb(mode)).delete('appointments', id);
    },

    async listRideLogs() {
      return (await getDb(mode)).getAll('rideLogs');
    },
    async saveRideLog(log) {
      await (await getDb(mode)).put('rideLogs', log);
    },
    async deleteRideLog(id) {
      await (await getDb(mode)).delete('rideLogs', id);
    },

    async clearAll() {
      const db = await getDb(mode);
      // A transaction groups changes so they all succeed or all fail.
      const tx = db.transaction(['profile', 'appointments', 'rideLogs'], 'readwrite');
      await Promise.all([
        tx.objectStore('profile').clear(),
        tx.objectStore('appointments').clear(),
        tx.objectStore('rideLogs').clear(),
        tx.done,
      ]);
    },
  };
}

/** Make a unique id for a new appointment or ride log. */
export function newId(): string {
  // crypto.randomUUID() is built into modern browsers.
  return crypto.randomUUID();
}
