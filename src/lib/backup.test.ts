// Tests for backup and restore. Run with: npm test
import { beforeEach, describe, expect, it } from 'vitest';
import { BackupError, createBackup, parseBackup, restoreBackup } from './backup';
import { DEMO_APPOINTMENTS, DEMO_PROFILE, DEMO_RIDE_LOGS } from './demoData';
import { createStorage } from './storage';

const real = createStorage('real');
const demo = createStorage('demo');

async function fill() {
  await real.saveProfile(DEMO_PROFILE);
  for (const a of DEMO_APPOINTMENTS) await real.saveAppointment(a);
  for (const l of DEMO_RIDE_LOGS) await real.saveRideLog(l);
}

beforeEach(async () => {
  await real.clearAll();
  await demo.clearAll();
});

describe('backup and restore', () => {
  it('restores exactly what was backed up (through a real JSON file)', async () => {
    await fill();
    const fileText = JSON.stringify(await createBackup(real, '2026-10-30T12:00:00.000Z'));
    await real.clearAll();

    await restoreBackup(real, parseBackup(fileText));

    expect(await real.getProfile()).toEqual(DEMO_PROFILE);
    expect(await real.listRideLogs()).toHaveLength(13);
    const dialysis = (await real.listAppointments()).find((a) => a.id === 'demo-dialysis');
    expect(dialysis?.recurrence).toEqual({ kind: 'weekly', weekdays: [1, 3, 5] });
  });

  it('replaces the data that was on the device', async () => {
    await fill();
    const backup = await createBackup(real, '2026-10-30T12:00:00.000Z');
    await real.saveAppointment({ ...DEMO_APPOINTMENTS[1], id: 'extra' });
    await restoreBackup(real, backup);
    expect((await real.listAppointments()).map((a) => a.id)).not.toContain('extra');
  });

  it('refuses to back up when there is nothing yet', async () => {
    await expect(createBackup(real, 'now')).rejects.toThrow(BackupError);
  });

  it('never restores into demo storage', async () => {
    await fill();
    const backup = await createBackup(real, 'now');
    await expect(restoreBackup(demo, backup)).rejects.toThrow(BackupError);
  });
});

describe('parseBackup checks the file carefully', () => {
  const good = () => ({
    format: 'rideproof-backup',
    version: 1,
    exportedAt: '2026-10-30T12:00:00.000Z',
    profile: DEMO_PROFILE,
    appointments: DEMO_APPOINTMENTS,
    rideLogs: DEMO_RIDE_LOGS,
  });

  it('rejects files that are not RideProof backups', () => {
    expect(() => parseBackup('not json at all')).toThrow('not a RideProof backup');
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow('not a RideProof backup');
  });

  it('rejects backups from a newer version', () => {
    expect(() => parseBackup(JSON.stringify({ ...good(), version: 99 }))).toThrow('newer version');
  });

  it('rejects damaged records with a plain-language message', () => {
    const badLog = { ...good(), rideLogs: [{ ...DEMO_RIDE_LOGS[0], pickupStatus: 'teleported' }] };
    expect(() => parseBackup(JSON.stringify(badLog))).toThrow('ride record in this file is damaged');
    const badAppt = { ...good(), appointments: [{ ...DEMO_APPOINTMENTS[0], date: 'someday' }] };
    expect(() => parseBackup(JSON.stringify(badAppt))).toThrow('appointment in this file is damaged');
  });

  it('fills in fields that older backups did not have', () => {
    const old = good();
    const { skippedDates: _unused, ...withoutSkipped } = { ...DEMO_APPOINTMENTS[0], skippedDates: [] };
    old.appointments = [withoutSkipped];
    const parsed = parseBackup(JSON.stringify(old));
    expect(parsed.appointments[0].skippedDates).toEqual([]);
  });
});
