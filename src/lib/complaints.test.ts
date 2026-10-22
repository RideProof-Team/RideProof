// Tests for the complaint follow-up tracker. Run with: npm test
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { BackupError, createBackup, parseBackup, restoreBackup } from './backup';
import { buildFollowUpLetter, sentPhrase } from './complaintLetter';
import {
  dueFollowUps,
  followUpDue,
  followUpReminderText,
  newSentComplaint,
  reminderDate,
  remindLater,
  setComplaintStatus,
  validateSentComplaint,
} from './complaints';
import { DEMO_TODAY } from './clock';
import { DEMO_APPOINTMENTS, DEMO_COMPLAINTS, DEMO_PROFILE, DEMO_RIDE_LOGS, resetDemo, seedDemoIfEmpty } from './demoData';
import { computeStats } from './reportStats';
import { createStorage, DB_NAMES, DB_VERSION } from './storage';
import type { SentComplaint } from '../types';

const complaint = (overrides: Partial<SentComplaint> = {}): SentComplaint => ({
  id: 'c1',
  sentDate: '2026-10-16',
  sentTo: 'Sample Health Plan',
  method: 'email',
  referenceNumber: 'REF-1',
  status: 'waiting',
  notes: '',
  ...overrides,
});

describe('the "Did you hear back?" reminder', () => {
  it('appears 14 days after sending, not before', () => {
    expect(reminderDate(complaint())).toBe('2026-10-30');
    expect(followUpDue(complaint(), '2026-10-29')).toBe(false);
    expect(followUpDue(complaint(), '2026-10-30')).toBe(true);
    expect(followUpDue(complaint(), '2026-11-20')).toBe(true); // still there until answered
  });

  it('only asks while the rider is still waiting', () => {
    for (const status of ['answered', 'fixed', 'not_fixed'] as const) {
      expect(followUpDue(complaint({ status }), '2026-11-20')).toBe(false);
    }
  });

  it('"Remind me in 7 days" moves it back a week', () => {
    const later = remindLater(complaint(), '2026-10-30');
    expect(later.remindOn).toBe('2026-11-06');
    expect(followUpDue(later, '2026-11-05')).toBe(false);
    expect(followUpDue(later, '2026-11-06')).toBe(true);
  });

  it('works across month and year ends', () => {
    expect(reminderDate(complaint({ sentDate: '2026-12-25' }))).toBe('2027-01-08');
  });

  it('lists due complaints oldest first', () => {
    const list = [complaint({ id: 'b', sentDate: '2026-10-10' }), complaint({ id: 'a', sentDate: '2026-10-01' }), complaint({ id: 'new', sentDate: '2026-10-29' })];
    expect(dueFollowUps(list, '2026-10-30').map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('says who, when, and the reference number', () => {
    expect(followUpReminderText(complaint(), '2026-10-30')).toEqual({
      title: 'Did you hear back from Sample Health Plan?',
      body: 'You sent a complaint on October 16, 2026 (14 days ago), reference number REF-1.',
    });
    expect(followUpReminderText(complaint({ referenceNumber: '' }), '2026-10-17').body).toBe(
      'You sent a complaint on October 16, 2026 (1 day ago).',
    );
  });
});

describe('status changes', () => {
  it('records the new status and the day it changed', () => {
    const fixed = setComplaintStatus(complaint(), 'fixed', '2026-11-02');
    expect(fixed).toMatchObject({ status: 'fixed', statusChangedOn: '2026-11-02' });
    expect(fixed.sentDate).toBe('2026-10-16'); // nothing else changes
  });

  it('going back to "Waiting" restarts the reminder from that day', () => {
    const answered = setComplaintStatus(complaint(), 'answered', '2026-11-01');
    const waitingAgain = setComplaintStatus(answered, 'waiting', '2026-11-03');
    expect(waitingAgain.remindOn).toBe('2026-11-10');
    expect(followUpDue(waitingAgain, '2026-11-09')).toBe(false);
  });
});

describe('the "I sent this complaint" form', () => {
  const input = { sentDate: '2026-10-16', sentTo: 'Sample Health Plan', method: 'email' as const, referenceNumber: ' R-9 ', notes: '' };

  it('accepts a complete form and starts as "Waiting"', () => {
    expect(validateSentComplaint(input, DEMO_TODAY)).toEqual({});
    expect(newSentComplaint('x', input)).toEqual({
      id: 'x', sentDate: '2026-10-16', sentTo: 'Sample Health Plan', method: 'email', referenceNumber: 'R-9', status: 'waiting', notes: '',
    });
    expect(newSentComplaint('y', input, 'x').followUpOf).toBe('x');
  });

  it('explains what is missing in plain words', () => {
    expect(validateSentComplaint({ sentDate: '', sentTo: '  ', method: '', referenceNumber: '', notes: '' }, DEMO_TODAY)).toEqual({
      sentDate: 'Enter the date you sent the complaint.',
      sentTo: 'Choose or type who you sent the complaint to.',
      method: 'Choose how you sent the complaint.',
    });
    expect(validateSentComplaint({ ...input, sentDate: '2026-11-01' }, DEMO_TODAY).sentDate).toBe("The date sent can't be in the future.");
  });
});

describe('the follow-up letter', () => {
  const letter = (c: SentComplaint, today = DEMO_TODAY) =>
    buildFollowUpLetter({ profile: DEMO_PROFILE, logs: DEMO_RIDE_LOGS, complaint: c, today });

  it('mentions the first complaint’s date, who, how, and reference number', () => {
    const text = letter(DEMO_COMPLAINTS[0]);
    expect(text).toContain('To: Sample Health Plan');
    expect(text).toContain('Re: Follow-up to my complaint of October 16, 2026 (reference number DEMO-C-1016)');
    expect(text).toContain(
      'On October 16, 2026, I sent a complaint to Sample Health Plan by email about repeated problems with these rides. ' +
        'The reference number is DEMO-C-1016. As of today, 14 days later, I have not received an answer.',
    );
    expect(text).toContain('1. Respond in writing to my complaint of October 16, 2026 (reference number DEMO-C-1016).');
  });

  it('lists only the NEW problems since the complaint, counted with computeStats', () => {
    const text = letter(DEMO_COMPLAINTS[0]);
    // In the demo, Oct 17–30: Oct 19 (stranded), Oct 21 (never came), Oct 23 (late), Oct 26 (ride home late).
    const stats = computeStats(DEMO_RIDE_LOGS, '2026-10-17', DEMO_TODAY);
    expect(stats.totalRides).toBe(5);
    expect(text).toContain(`Since October 16, 2026, I logged 5 rides, and 4 rides had a problem.`);
    expect(text).toContain('October 19, 2026: My ride home never came.');
    expect(text).toContain('October 21, 2026: The ride never came.');
    expect(text).not.toContain('October 14, 2026:'); // before the complaint
    expect(text).not.toContain('October 16, 2026: Pickup'); // the day it was sent counts as "before"
    expect(text).toContain('Since my complaint, the problems have continued. Between October 19 and October 28, 2026');
    expect(text).toContain('2. Investigate the new incidents listed above.');
  });

  it('changes the wording for each status', () => {
    expect(letter(complaint({ status: 'not_fixed' }))).toContain('The problems I reported have not been fixed.');
    expect(letter(complaint({ status: 'answered' }))).toContain('I received an answer, but I am still waiting for the problems to be fixed.');
  });

  it('works with no reference number and no new problems', () => {
    const text = letter(complaint({ sentDate: '2026-10-28', referenceNumber: '', method: 'phone' }), '2026-10-29');
    expect(text).toContain('Re: Follow-up to my complaint of October 28, 2026 about');
    expect(text).toContain('I made a complaint to Sample Health Plan by phone about repeated problems with these rides. As of today, 1 day later');
    expect(text).toContain('I have not logged any rides since October 28, 2026');
    expect(text).not.toContain('Investigate the new incidents');
    expect(text).toContain('2. Tell me what will be done');
    expect(text).not.toContain('reference number');
  });

  it('describes each way of sending', () => {
    expect(sentPhrase('mail', 'X')).toBe('mailed a complaint to X');
    expect(sentPhrase('online_form', 'X')).toBe('sent a complaint to X through their online form');
  });
});

describe('complaints in storage and backups', () => {
  const real = createStorage('real');
  beforeEach(async () => {
    await real.clearAll();
  });

  async function fill() {
    await real.saveProfile(DEMO_PROFILE);
    for (const a of DEMO_APPOINTMENTS) await real.saveAppointment(a);
    for (const l of DEMO_RIDE_LOGS) await real.saveRideLog(l);
    await real.saveComplaint(complaint({ statusChangedOn: '2026-10-20', remindOn: '2026-11-01', notes: 'Called twice' }));
  }

  it('backs up and restores complaints', async () => {
    await fill();
    const file = JSON.stringify(await createBackup(real, 'now'));
    await real.clearAll();
    await restoreBackup(real, parseBackup(file));
    expect(await real.listComplaints()).toEqual([
      complaint({ statusChangedOn: '2026-10-20', remindOn: '2026-11-01', notes: 'Called twice' }),
    ]);
  });

  it('still restores an older (version 1) backup, with no complaints', async () => {
    await fill();
    const backup = await createBackup(real, 'now');
    const { complaints: _left, ...old } = { ...backup, version: 1 };
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed.complaints).toEqual([]);
    await restoreBackup(real, parsed);
    expect(await real.listComplaints()).toEqual([]);
    expect(await real.listRideLogs()).toHaveLength(DEMO_RIDE_LOGS.length);
  });

  it('explains damaged complaint records in plain language', () => {
    const file = (c: object) =>
      JSON.stringify({ format: 'rideproof-backup', version: 2, profile: DEMO_PROFILE, appointments: [], rideLogs: [], complaints: [c] });
    expect(() => parseBackup(file({ ...complaint(), status: 'lost' }))).toThrow(
      'The complaint sent on October 16, 2026 has a damaged status. It must be Waiting, Got an answer, Problem fixed, or Not fixed.',
    );
    expect(() => parseBackup(file({ ...complaint(), method: 'pigeon' }))).toThrow('has a damaged "how it was sent" answer');
    expect(() => parseBackup(file({ ...complaint(), sentTo: '' }))).toThrow('is missing who it was sent to');
    expect(() => parseBackup(file({ ...complaint(), sentDate: 'yesterday' }))).toThrow(BackupError);
    expect(() => parseBackup(file({ ...complaint(), remindOn: 'soon' }))).toThrow('has a damaged date');
  });
});

describe('database upgrade to version 3', () => {
  it('keeps every record from version 2 (including timers) and adds the complaints box, in both databases', async () => {
    for (const mode of ['real', 'demo'] as const) {
      await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(DB_NAMES[mode]);
        request.onsuccess = request.onerror = resolve;
      });
      const old = await openDB(DB_NAMES[mode], 2, {
        upgrade(db) {
          db.createObjectStore('profile');
          db.createObjectStore('appointments', { keyPath: 'id' });
          db.createObjectStore('rideLogs', { keyPath: 'id' });
          db.createObjectStore('waits', { keyPath: 'id' });
        },
      });
      await old.put('profile', { ...DEMO_PROFILE, riderFirstName: `Old ${mode}` }, 'profile');
      await old.put('rideLogs', DEMO_RIDE_LOGS[0]);
      await old.put('waits', { id: 'w1', appointmentId: 'a' });
      old.close();

      const storage = createStorage(mode);
      expect((await storage.getProfile())?.riderFirstName).toBe(`Old ${mode}`);
      expect(await storage.listRideLogs()).toEqual([DEMO_RIDE_LOGS[0]]);
      expect((await storage.listWaits()).map((w) => w.id)).toEqual(['w1']);
      expect(await storage.listComplaints()).toEqual([]);
      await storage.saveComplaint(complaint());
      expect(await storage.listComplaints()).toHaveLength(1);
      await storage.clearAll();
    }
    expect(DB_VERSION).toBeGreaterThanOrEqual(3);
  });
});

describe('demo complaint', () => {
  it('Maria’s Oct 16 complaint is waiting and due for follow-up on demo "today"; Reset demo restores it', async () => {
    const demo = createStorage('demo');
    await demo.clearAll();
    await seedDemoIfEmpty(demo);
    const [c] = await demo.listComplaints();
    expect(c).toMatchObject({ sentDate: '2026-10-16', sentTo: DEMO_PROFILE.healthPlanName, status: 'waiting' });
    expect(followUpDue(c, DEMO_TODAY)).toBe(true);

    await demo.saveComplaint(setComplaintStatus(c, 'not_fixed', DEMO_TODAY));
    await resetDemo(demo);
    expect((await demo.listComplaints())[0].status).toBe('waiting');
    // Demo data never leaks into real storage.
    expect(await createStorage('real').listComplaints()).toEqual([]);
  });
});
