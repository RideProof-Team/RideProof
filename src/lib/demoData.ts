// ---------------------------------------------------------------------------
// demoData.ts — the sample story shown in demo mode. ALL OF IT IS FAKE.
//
// The story: Rosa (72) goes to dialysis every Monday, Wednesday, and Friday.
// Her granddaughter Maria uses RideConnect in caregiver mode. Over the past
// month, 13 dialysis rides were logged:
//   - 5 late pickups (15, 30, and 60+ minutes)
//   - 2 rides that never came (one made her miss dialysis on Oct 14)
//   - 1 ride home that never came ("Waited 2 hours for ride home")
//   - 1 ride home about 30 minutes late
//   - at least 3 hours spent waiting in total (see timeLost.ts)
// Right now (noon on the simulated demo clock), Rosa is done with dialysis
// and has been waiting 10 minutes for her ride home (the wait timer).
// On Oct 16 Maria emailed a complaint to Rosa's health plan. Two weeks
// later there's still no answer, so Home asks "Did you hear back?".
// On Oct 29 Maria called to book Tuesday's cardiology ride but couldn't
// get through (on hold, then the call dropped). It's saved as evidence,
// and the ride still shows as NOT booked.
// "Today" in demo mode is DEMO_TODAY (Friday, Oct 30, 2026): there's a
// dialysis appointment to check in on, and a cardiology appointment on
// Tuesday whose ride isn't booked yet, so a booking reminder shows.
//
// The demo data is only ever written to the DEMO database (see storage.ts).
// ---------------------------------------------------------------------------
import type { ActiveWait, Appointment, FailedBooking, Profile, RideLog, SentComplaint } from '../types';
import { DEMO_TODAY, nowMoment, resetDemoClock } from './clock';
import type { Storage } from './storage';
import { waitId } from './waitTimer';

export const DEMO_PROFILE: Profile = {
  role: 'caregiver',
  riderFirstName: 'Rosa',
  caregiverName: 'Maria',
  state: 'WA',
  rideCompanyName: 'Sample Ride Co.',
  rideCompanyPhone: '555-0100', // 555-01xx numbers are reserved for fiction
  healthPlanName: 'Sample Health Plan',
  mobilityNeeds: 'walker',
  homeAddress: '300 Sample Lane, Sampletown', // fake
};

export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'demo-dialysis',
    date: '2026-09-30',
    time: '09:00',
    clinicName: 'Riverside Dialysis Center',
    clinicAddress: '100 Sample Street, Sampletown',
    clinicPhone: '555-0142', // fake (555-01xx)
    type: 'dialysis',
    recurrence: { kind: 'weekly', weekdays: [1, 3, 5] },
    rideBooked: true, // a standing ride order
    confirmationNumber: 'DEMO-4417',
  },
  {
    id: 'demo-cardiology',
    date: '2026-11-03',
    time: '10:30',
    clinicName: 'Sample Heart Clinic (cardiology)',
    clinicAddress: '200 Example Avenue, Sampletown',
    type: 'specialist',
    recurrence: { kind: 'none' },
    rideBooked: false, // not booked yet -> booking reminder on Home
    confirmationNumber: '',
  },
];

/** A shortcut for writing one dialysis ride log. */
function ride(rideDate: string, details: Partial<RideLog>): RideLog {
  return {
    id: `demo-log-${rideDate}`,
    appointmentId: 'demo-dialysis',
    clinicName: 'Riverside Dialysis Center',
    appointmentType: 'dialysis',
    rideDate,
    pickupStatus: 'on_time',
    minutesLate: null,
    appointmentOutcome: 'made_it',
    returnRideStatus: 'on_time',
    notes: '',
    // As if Maria logged each ride around 11:30 AM Pacific time that day.
    recordedAt: `${rideDate}T18:30:00.000Z`,
    ...details,
  };
}

export const DEMO_RIDE_LOGS: RideLog[] = [
  ride('2026-09-30', {}),
  ride('2026-10-02', { pickupStatus: 'late', minutesLate: 15 }),
  ride('2026-10-05', {}),
  ride('2026-10-07', { pickupStatus: 'late', minutesLate: 30, appointmentOutcome: 'late' }),
  ride('2026-10-09', {}),
  ride('2026-10-12', { pickupStatus: 'late', minutesLate: 15 }),
  ride('2026-10-14', {
    pickupStatus: 'never_came',
    appointmentOutcome: 'missed',
    returnRideStatus: 'not_needed',
    notes: 'Called the ride company twice. No driver came. Missed dialysis.',
  }),
  ride('2026-10-16', {
    pickupStatus: 'late',
    minutesLate: 60,
    appointmentOutcome: 'late',
    notes: 'Driver came over an hour late. Treatment was cut short.',
  }),
  ride('2026-10-19', {
    returnRideStatus: 'never_came',
    notes: 'Waited 2 hours for ride home. A neighbor finally gave a ride.',
  }),
  ride('2026-10-21', {
    pickupStatus: 'never_came',
    appointmentOutcome: 'late',
    notes: 'No driver came. Paid for a taxi to get there.',
  }),
  ride('2026-10-23', { pickupStatus: 'late', minutesLate: 30, appointmentOutcome: 'late' }),
  // The ride home was about 30 minutes late (shows up in "time spent waiting").
  ride('2026-10-26', { returnRideStatus: 'late', returnMinutesLate: 30 }),
  ride('2026-10-28', {}),
];

/** The complaint Maria sent on Oct 16. 14 days later (demo "today") it's still waiting. */
export const DEMO_COMPLAINTS: SentComplaint[] = [
  {
    id: 'demo-complaint',
    sentDate: '2026-10-16',
    sentTo: 'Sample Health Plan',
    method: 'email',
    referenceNumber: 'DEMO-C-1016', // fake
    status: 'waiting',
    notes: 'Sent the letter to member services. They said to expect an answer within 10 business days.',
  },
];

/** Maria's call on Thursday to book Tuesday's cardiology ride didn't get through. */
export const DEMO_BOOKING_ATTEMPTS: FailedBooking[] = [
  {
    id: 'demo-booking-call',
    appointmentId: 'demo-cardiology',
    tripDate: '2026-11-03',
    clinicName: 'Sample Heart Clinic (cardiology)',
    appointmentType: 'specialist',
    attemptedOn: '2026-10-29',
    recordedAt: '2026-10-29T17:45:00.000Z',
    reason: 'no_answer',
    details: 'On hold for 25 minutes, then the call dropped.',
  },
];

/** Refuse to touch anything except the demo database. */
function requireDemo(storage: Storage) {
  if (storage.mode !== 'demo') {
    throw new Error('Demo data can only be written to demo storage.');
  }
}

/** Write the starting demo story into demo storage. */
/**
 * Today (Friday, noon on the simulated demo clock): Rosa finished dialysis
 * and has been waiting 10 minutes for her ride home. Built fresh each time,
 * because "10 minutes ago" depends on when the demo clock started.
 */
export function demoWaits(now: Date): ActiveWait[] {
  return [
    {
      id: waitId('demo-dialysis', DEMO_TODAY, 'return'),
      appointmentId: 'demo-dialysis',
      tripDate: DEMO_TODAY,
      leg: 'return',
      scheduledTime: null,
      scheduledIsEstimate: false,
      startedAt: new Date(now.getTime() - 10 * 60_000).toISOString(),
      promptsShown: [],
    },
  ];
}

async function writeDemoData(storage: Storage) {
  requireDemo(storage);
  await storage.saveProfile(DEMO_PROFILE);
  for (const appointment of DEMO_APPOINTMENTS) await storage.saveAppointment(appointment);
  for (const log of DEMO_RIDE_LOGS) await storage.saveRideLog(log);
  for (const complaint of DEMO_COMPLAINTS) await storage.saveComplaint(complaint);
  for (const attempt of DEMO_BOOKING_ATTEMPTS) await storage.saveBookingAttempt(attempt);
  // Start the simulated clock at noon, then add the running wait timer.
  resetDemoClock();
  for (const wait of demoWaits(nowMoment('demo'))) await storage.saveWait(wait);
}

/** The first time demo mode is turned on, fill the demo database. */
export async function seedDemoIfEmpty(storage: Storage) {
  requireDemo(storage);
  if (!(await storage.getProfile())) await writeDemoData(storage);
}

/** "Reset demo": erase demo changes and start the story over (for another video take). */
export async function resetDemo(storage: Storage) {
  requireDemo(storage);
  await storage.clearAll();
  await writeDemoData(storage);
}
