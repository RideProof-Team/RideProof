// ---------------------------------------------------------------------------
// storage.ts — saves and loads all of RideConnect's data on the device.
//
// We use IndexedDB, a database built into every modern browser. Data stays
// on this phone/computer only; nothing is ever sent over the internet.
// The `idb` library wraps IndexedDB so we can use simple async/await code.
//
// KEY IDEA: real data and demo data live in two COMPLETELY SEPARATE
// databases (using stable legacy identifiers). The rest of the app
// asks for a Storage object for one mode, and that object can only ever
// touch its own database. This makes it impossible for demo mode to
// change, delete, or mix with the user's real data.
// ---------------------------------------------------------------------------
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ActiveWait, Appointment, Profile, RideLog, SentComplaint } from '../types';

export type DataMode = 'real' | 'demo';

/** Stable legacy names preserve existing records after the RideConnect rename. */
export const DB_NAMES: Record<DataMode, string> = {
  real: 'rideproof-real',
  demo: 'rideproof-demo',
};

// Bump this number whenever the database layout below changes, and add a
// step to upgrade() below. Version history:
//   1: profile, appointments, rideLogs
//   2: + waits (the "Where's my ride?" timers)
//   3: + complaints (complaints the rider sent, for the follow-up tracker)
export const DB_VERSION = 3;

// The profile is stored under this one fixed key, since there's only one.
const PROFILE_KEY = 'profile';

/** Describes the database layout ("object stores" are like tables). */
interface RideConnectDB extends DBSchema {
  profile: { key: string; value: Profile };
  appointments: { key: string; value: Appointment };
  rideLogs: { key: string; value: RideLog };
  waits: { key: string; value: ActiveWait };
  complaints: { key: string; value: SentComplaint };
}

// Opening a database takes time, so we remember the open connection for
// each mode and reuse it instead of reopening it on every save.
const openDatabases = new Map<DataMode, Promise<IDBPDatabase<RideConnectDB>>>();

function getDb(mode: DataMode): Promise<IDBPDatabase<RideConnectDB>> {
  let db = openDatabases.get(mode);
  if (!db) {
    const opening: Promise<IDBPDatabase<RideConnectDB>> = openDB<RideConnectDB>(DB_NAMES[mode], DB_VERSION, {
      // upgrade() runs when the database is brand new, or when this app's
      // DB_VERSION is higher than the version saved on the phone.
      // `oldVersion` says what the phone has (0 = nothing yet). Each step only
      // ADDS what's missing, so a phone on version 1 keeps every profile,
      // appointment, and ride log, and just gains the new boxes.
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('profile');
          database.createObjectStore('appointments', { keyPath: 'id' });
          database.createObjectStore('rideLogs', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          database.createObjectStore('waits', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          database.createObjectStore('complaints', { keyPath: 'id' });
        }
      },
      // Another tab (for example, a newer version of RideConnect) needs to
      // upgrade or delete this database, but this tab still has it open.
      // Close our connection so the other tab isn't stuck waiting forever;
      // the next save or load here simply opens it again.
      blocking() {
        void opening.then((database) => database.close());
        if (openDatabases.get(mode) === opening) openDatabases.delete(mode);
      },
    });
    void opening.catch(() => {
      if (openDatabases.get(mode) === opening) openDatabases.delete(mode);
    });
    openDatabases.set(mode, opening);
    db = opening;
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
  listWaits(): Promise<ActiveWait[]>;
  saveWait(wait: ActiveWait): Promise<void>;
  deleteWait(id: string): Promise<void>;
  listComplaints(): Promise<SentComplaint[]>;
  saveComplaint(complaint: SentComplaint): Promise<void>;
  deleteComplaint(id: string): Promise<void>;
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

    async listWaits() {
      return (await getDb(mode)).getAll('waits');
    },
    async saveWait(wait) {
      await (await getDb(mode)).put('waits', wait);
    },
    async deleteWait(id) {
      await (await getDb(mode)).delete('waits', id);
    },

    async listComplaints() {
      return (await getDb(mode)).getAll('complaints');
    },
    async saveComplaint(complaint) {
      await (await getDb(mode)).put('complaints', complaint);
    },
    async deleteComplaint(id) {
      await (await getDb(mode)).delete('complaints', id);
    },

    async clearAll() {
      const db = await getDb(mode);
      // A transaction groups changes so they all succeed or all fail.
      const tx = db.transaction(['profile', 'appointments', 'rideLogs', 'waits', 'complaints'], 'readwrite');
      await Promise.all([
        tx.objectStore('profile').clear(),
        tx.objectStore('appointments').clear(),
        tx.objectStore('rideLogs').clear(),
        tx.objectStore('waits').clear(),
        tx.objectStore('complaints').clear(),
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
