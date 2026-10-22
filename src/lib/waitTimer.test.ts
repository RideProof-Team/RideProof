// Tests for the "Where's my ride?" wait timer. Run with: npm test
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildRideLog } from './checkinFlow';
import { DEMO_TODAY, jumpDemoClock, nowMoment, resetDemoClock } from './clock';
import { resetDemo, seedDemoIfEmpty } from './demoData';
import { computeStats } from './reportStats';
import { createStorage, DB_NAMES, DB_VERSION } from './storage';
import {
  bucketFor,
  canMarkNeverCame,
  duePrompt,
  elapsedSeconds,
  finishWait,
  formatClock,
  markPromptShown,
  minutesLateNow,
  minutesUntilPickup,
  pickupTimeFor,
  prefillFromWaits,
  startWait,
} from './waitTimer';
import type { Appointment } from '../types';

const appointment: Appointment = {
  id: 'appt',
  date: '2026-10-01',
  time: '09:00',
  clinicName: 'Sample Clinic',
  clinicAddress: '',
  type: 'dialysis',
  recurrence: { kind: 'weekly', weekdays: [1, 3, 5] },
  rideBooked: true,
  confirmationNumber: '',
  pickupTime: '08:15',
};
/** A moment on Friday, Oct 30, 2026 (local time). */
const at = (time: string, seconds = 0) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(2026, 9, 30, h, m, seconds);
};

describe('pickup time', () => {
  it('uses the time the ride company gave, or estimates 1 hour before the appointment', () => {
    expect(pickupTimeFor(appointment)).toEqual({ time: '08:15', isEstimate: false });
    expect(pickupTimeFor({ ...appointment, pickupTime: undefined })).toEqual({ time: '08:00', isEstimate: true });
    expect(pickupTimeFor({ ...appointment, pickupTime: undefined, time: '00:30' }).time).toBe('23:30');
  });
});

describe('the timer is worked out from the start time, so it survives reloads', () => {
  it('gives the same answer after the timer is saved and loaded again', async () => {
    const storage = createStorage('real');
    await storage.clearAll();
    const wait = startWait(appointment, DEMO_TODAY, 'pickup', at('08:10'));
    await storage.saveWait(wait);

    // "Close the app", come back 47 minutes later, and load the timer again.
    const [loaded] = await storage.listWaits();
    expect(elapsedSeconds(loaded, at('08:57'))).toBe(47 * 60);
    expect(elapsedSeconds(loaded, at('08:57'))).toBe(elapsedSeconds(wait, at('08:57')));
    await storage.clearAll();
  });

  it('formats the clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(754)).toBe('12:34');
    expect(formatClock(3909)).toBe('1:05:09');
  });

  it('stops counting when the wait has ended', () => {
    const done = finishWait(startWait(appointment, DEMO_TODAY, 'return', at('12:00')), 'arrived', at('12:20'));
    expect(elapsedSeconds(done, at('15:00'))).toBe(20 * 60);
  });
});

describe('minutes late', () => {
  const pickup = startWait(appointment, DEMO_TODAY, 'pickup', at('08:05'));

  it('pickup: counts only from the pickup time (8:15), not from when the timer started', () => {
    expect(minutesUntilPickup(pickup, at('08:05'))).toBe(10);
    expect(minutesLateNow(pickup, at('08:10'))).toBe(0);
    expect(minutesLateNow(pickup, at('08:40'))).toBe(25);
  });

  it('ride home: counts from when the rider started waiting', () => {
    const home = startWait(appointment, DEMO_TODAY, 'return', at('12:00'));
    expect(home.scheduledTime).toBeNull();
    expect(minutesLateNow(home, at('12:16'))).toBe(16);
  });

  it('prompts once at 15 and once at 30 minutes late', () => {
    expect(duePrompt(pickup, at('08:29'))).toBeNull();
    expect(duePrompt(pickup, at('08:30'))).toBe(15);
    const after15 = markPromptShown(pickup, 15);
    expect(duePrompt(after15, at('08:35'))).toBeNull();
    expect(duePrompt(after15, at('08:45'))).toBe(30);
    expect(duePrompt(markPromptShown(after15, 30), at('09:30'))).toBeNull();
  });

  it('coming back late shows only the latest prompt', () => {
    expect(duePrompt(pickup, at('09:00'))).toBe(30);
    expect(markPromptShown(pickup, 30).promptsShown).toEqual([15, 30]);
  });

  it('offers "My ride never came" from 30 minutes late', () => {
    expect(canMarkNeverCame(pickup, at('08:44'))).toBe(false);
    expect(canMarkNeverCame(pickup, at('08:45'))).toBe(true);
  });
});

describe('what the timer fills in on the check-in', () => {
  const details = { id: 'log', appointmentId: 'appt', clinicName: 'C', appointmentType: 'dialysis' as const, rideDate: DEMO_TODAY, recordedAt: '' };

  it('ride came 37 minutes late: "Late, about 30 minutes", with the exact minutes and times', () => {
    const done = finishWait(startWait(appointment, DEMO_TODAY, 'pickup', at('08:10')), 'arrived', at('08:52'));
    expect(prefillFromWaits([done])).toEqual({
      pickupStatus: 'late',
      minutesLate: 30,
      pickupWaitMinutes: 37,
      scheduledPickup: '08:15',
      actualPickup: '08:52',
    });
  });

  it('a few minutes late still counts as on time', () => {
    const done = finishWait(startWait(appointment, DEMO_TODAY, 'pickup', at('08:10')), 'arrived', at('08:19'));
    expect(prefillFromWaits([done])).toMatchObject({ pickupStatus: 'on_time', actualPickup: '08:19' });
    expect(prefillFromWaits([done]).pickupWaitMinutes).toBeUndefined();
  });

  it('ride home never came after 50 minutes', () => {
    const done = finishWait(startWait(appointment, DEMO_TODAY, 'return', at('12:00')), 'never_came', at('12:50'));
    expect(prefillFromWaits([done])).toEqual({ returnRideStatus: 'never_came', returnWaitMinutes: 50 });
  });

  it('does not use an estimated pickup time as "the time you were given"', () => {
    const estimated = { ...appointment, pickupTime: undefined };
    const done = finishWait(startWait(estimated, DEMO_TODAY, 'pickup', at('08:00')), 'arrived', at('08:20'));
    expect(prefillFromWaits([done]).scheduledPickup).toBeUndefined();
  });

  it('turns exact minutes into the closest answer', () => {
    expect([1, 22, 23, 44, 45, 120].map(bucketFor)).toEqual([15, 15, 30, 30, 60, 60]);
  });

  it('the stats use the exact minutes instead of the 15/30/60 answer', () => {
    const pickupDone = finishWait(startWait(appointment, DEMO_TODAY, 'pickup', at('08:10')), 'arrived', at('09:37')); // 82 min late
    const homeDone = finishWait(startWait(appointment, DEMO_TODAY, 'return', at('12:00')), 'never_came', at('12:50'));
    const prefill = prefillFromWaits([pickupDone, homeDone]);
    const log = buildRideLog({ ...prefill, appointmentOutcome: 'late', notes: '' }, details);
    expect(log).toMatchObject({ minutesLate: 60, pickupWaitMinutes: 82, returnWaitMinutes: 50 });

    const stats = computeStats([log], DEMO_TODAY, DEMO_TODAY);
    expect(stats.waitMinutes).toBe(82 + 50); // not 60 + nothing
    expect(stats.waitPrecision).toBe('exact');
    expect(stats.untimedNeverCame).toBe(0);
  });

  it('drops the timer minutes if the rider changes the answer to on time', () => {
    const log = buildRideLog(
      { pickupStatus: 'on_time', pickupWaitMinutes: 40, appointmentOutcome: 'made_it', returnRideStatus: 'on_time', notes: '' },
      details,
    );
    expect(log.pickupWaitMinutes).toBeUndefined();
  });
});

describe('database upgrade from version 1 to 2', () => {
  beforeEach(() => resetDemoClock());

  it('keeps every existing record and adds the timers box, in both databases', async () => {
    for (const mode of ['real', 'demo'] as const) {
      // Make a version-1 database the way the app did before this update.
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(DB_NAMES[mode]);
        request.onsuccess = request.onerror = resolve;
      });
      const old = await openDB(DB_NAMES[mode], 1, {
        upgrade(db) {
          db.createObjectStore('profile');
          db.createObjectStore('appointments', { keyPath: 'id' });
          db.createObjectStore('rideLogs', { keyPath: 'id' });
        },
      });
      await old.put('profile', { role: 'rider', riderFirstName: `Old ${mode}` }, 'profile');
      await old.put('appointments', appointment);
      old.close();

      // Now open it the new way (version 2).
      const storage = createStorage(mode);
      expect((await storage.getProfile())?.riderFirstName).toBe(`Old ${mode}`);
      expect(await storage.listAppointments()).toEqual([appointment]);
      expect(await storage.listWaits()).toEqual([]);
      await storage.saveWait(startWait(appointment, DEMO_TODAY, 'pickup', at('08:10')));
      expect(await storage.listWaits()).toHaveLength(1);
      await storage.clearAll();
    }
    expect(DB_VERSION).toBe(2);
  });
});

describe('demo timer', () => {
  it('Rosa has been waiting 10 minutes for her ride home, and Reset demo brings it back', async () => {
    const demo = createStorage('demo');
    await demo.clearAll();
    await seedDemoIfEmpty(demo);
    const [wait] = await demo.listWaits();
    expect(wait).toMatchObject({ leg: 'return', tripDate: DEMO_TODAY, appointmentId: 'demo-dialysis' });
    expect(minutesLateNow(wait, nowMoment('demo'))).toBe(10);

    // "Jump ahead 15 minutes" in Demo controls.
    jumpDemoClock(15);
    expect(minutesLateNow(wait, nowMoment('demo'))).toBe(25);
    expect(duePrompt(wait, nowMoment('demo'))).toBe(15);

    // Finish it, then reset: the 10-minute timer is back.
    await demo.saveWait(finishWait(wait, 'arrived', nowMoment('demo')));
    await resetDemo(demo);
    const [fresh] = await demo.listWaits();
    expect(fresh.finishedAt).toBeUndefined();
    expect(minutesLateNow(fresh, nowMoment('demo'))).toBe(10);
  });

  it('the simulated demo clock starts at noon on demo "today"', () => {
    resetDemoClock();
    const now = nowMoment('demo');
    expect([now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]).toEqual([2026, 10, 30, 12, 0]);
  });
});
