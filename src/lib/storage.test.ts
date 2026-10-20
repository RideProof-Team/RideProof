// Tests for storage.ts. Run with: npm test
// The main goal: prove demo data and real data NEVER mix.
import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage } from './storage';
import type { Appointment, Profile, RideLog } from '../types';

const realProfile: Profile = {
  role: 'rider',
  riderFirstName: 'Test Rider',
  state: 'WA',
  rideCompanyName: 'Real Test Rides',
  rideCompanyPhone: '555-0199',
  healthPlanName: '',
};

const demoProfile: Profile = { ...realProfile, role: 'caregiver', riderFirstName: 'Rosa' };

const appointment: Appointment = {
  id: 'appt-1',
  date: '2026-10-29',
  time: '09:00',
  clinicName: 'Test Clinic',
  clinicAddress: '',
  type: 'dialysis',
  recurrence: { kind: 'weekly', weekdays: [1, 3, 5] },
  rideBooked: true,
  confirmationNumber: '',
};

const rideLog: RideLog = {
  id: 'log-1',
  appointmentId: 'appt-1',
  rideDate: '2026-10-28',
  pickupStatus: 'late',
  minutesLate: 30,
  appointmentOutcome: 'late',
  returnRideStatus: 'on_time',
  notes: '',
  recordedAt: '2026-10-28T10:00:00.000Z',
};

const real = createStorage('real');
const demo = createStorage('demo');

// Start every test with both databases empty.
beforeEach(async () => {
  await real.clearAll();
  await demo.clearAll();
});

describe('storage', () => {
  it('saves and loads a profile, appointment, and ride log', async () => {
    await real.saveProfile(realProfile);
    await real.saveAppointment(appointment);
    await real.saveRideLog(rideLog);

    expect(await real.getProfile()).toEqual(realProfile);
    expect(await real.listAppointments()).toEqual([appointment]);
    expect(await real.listRideLogs()).toEqual([rideLog]);
  });

  it('replaces an appointment saved again with the same id', async () => {
    await real.saveAppointment(appointment);
    await real.saveAppointment({ ...appointment, rideBooked: false });
    const all = await real.listAppointments();
    expect(all).toHaveLength(1);
    expect(all[0].rideBooked).toBe(false);
  });
});

describe('demo data never mixes with real data', () => {
  it('data saved in demo mode is not visible in real mode (and vice versa)', async () => {
    await real.saveProfile(realProfile);
    await demo.saveProfile(demoProfile);
    await demo.saveAppointment(appointment);
    await demo.saveRideLog(rideLog);

    expect(await real.getProfile()).toEqual(realProfile);
    expect(await real.listAppointments()).toEqual([]);
    expect(await real.listRideLogs()).toEqual([]);
    expect(await demo.getProfile()).toEqual(demoProfile);
  });

  it('clearing demo data leaves real data untouched', async () => {
    await real.saveProfile(realProfile);
    await real.saveAppointment(appointment);
    await demo.saveProfile(demoProfile);
    await demo.saveAppointment(appointment);

    await demo.clearAll();

    expect(await demo.getProfile()).toBeUndefined();
    expect(await demo.listAppointments()).toEqual([]);
    expect(await real.getProfile()).toEqual(realProfile);
    expect(await real.listAppointments()).toEqual([appointment]);
  });

  it('deleting a demo appointment does not delete the real one with the same id', async () => {
    await real.saveAppointment(appointment);
    await demo.saveAppointment(appointment);
    await demo.deleteAppointment(appointment.id);
    expect(await real.listAppointments()).toEqual([appointment]);
  });
});
