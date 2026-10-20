// ---------------------------------------------------------------------------
// Home.tsx — the main screen. Answers the questions people have most:
//   - Do I have an appointment today? -> big "Check in" button
//   - When is my next appointment, and is the ride booked?
//   - What's coming up after that?
//   - Is a ride booking deadline coming up? -> reminder with Call button
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { BookingReminders } from '../components/BookingReminders';
import { BookingStatus } from '../components/BookingStatus';
import { CheckInNudge } from '../components/CheckInNudge';
import { GettingStarted } from '../components/GettingStarted';
import { SkipDayButton } from '../components/SkipDayButton';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { findLog } from '../lib/checkinFlow';
import { getNowTime } from '../lib/clock';
import { introHidden } from '../lib/onboarding';
import { addDays, formatLongDate, formatShortDate, formatTime } from '../lib/dates';
import { APPOINTMENT_TYPE_LABELS, whose } from '../lib/labels';
import { upcomingTrips } from '../lib/recurrence';
import { bookingReminders } from '../lib/reminders';
import { SEVERITY_DISPLAY, rideSeverity } from '../lib/rideStatus';
import { loadLastBackupDate } from '../lib/backup';
import { showSnackbar } from '../lib/feedback';
import { routeToHash } from '../lib/router';
import { getStateRule } from '../lib/stateRules';
import type { Appointment } from '../types';
import { useRideData } from '../lib/useRideData';

/** How many appointments to list under "Coming up". */
const COMING_UP_COUNT = 4;

export function Home() {
  const { profile, today, storage, mode } = useApp();
  const { data, reload } = useRideData();
  if (!profile) return null;
  const title = profile.role === 'caregiver' ? `${profile.riderFirstName}'s rides` : `Hi, ${profile.riderFirstName}`;
  if (!data) return <Screen title={title}><p>Loading…</p></Screen>;
  const { appointments, rideLogs } = data;

  const trips = upcomingTrips(appointments, today);
  const todaysTrips = trips.filter((t) => t.date === today);
  const notCheckedIn = todaysTrips.filter((t) => !findLog(rideLogs, t.appointment.id, t.date));
  // Is it after the appointment time yet? Then the ride has happened (or should have).
  const nowTime = getNowTime(mode);
  const readyToCheckIn = notCheckedIn.some((t) => t.appointment.time <= nowTime);
  const laterTrips = trips.filter((t) => t.date > today);
  const nextTrip = laterTrips[0];
  const comingUp = laterTrips.slice(1, 1 + COMING_UP_COUNT);
  const stateRule = getStateRule(profile.state);
  const reminders = stateRule ? bookingReminders(appointments, today, stateRule.bookingWindowBusinessDays) : [];

  // One tap to mark a ride as booked, right from Home.
  async function markBooked(appointment: Appointment) {
    await storage.saveAppointment({ ...appointment, rideBooked: true });
    await reload();
    showSnackbar('Marked as booked.', {
      label: 'Undo',
      run: async () => {
        await storage.saveAppointment(appointment);
        await reload();
      },
    });
  }

  // With exactly one trip left to check in on, the button goes straight to it.
  const checkInHref =
    notCheckedIn.length === 1
      ? routeToHash({ name: 'checkin', appointmentId: notCheckedIn[0].appointment.id, date: today })
      : routeToHash({ name: 'checkin' });

  return (
    <Screen title={title}>
      <p className="today-line">Today is {formatLongDate(today, true)}</p>

      {mode === 'real' && <GettingStarted hasAppointments={appointments.length > 0} hasCheckIns={rideLogs.length > 0} />}
      {mode === 'real' && <CheckInNudge trips={notCheckedIn} />}

      {appointments.length === 0 && introHidden() && (
        <section className="card">
          <h2>Get started</h2>
          <p>Add {profile.role === 'caregiver' ? `${profile.riderFirstName}'s` : 'your'} medical appointments so RideProof can track the rides.</p>
          <a href={routeToHash({ name: 'appointment-new' })} className="button-primary">
            <Icon name="plus" /> Add an appointment
          </a>
        </section>
      )}

      {todaysTrips.length > 0 && (
        <section className="card card-today" aria-labelledby="today-heading">
          <h2 id="today-heading">Today</h2>
          <ul className="plain-list">
            {todaysTrips.map((trip) => {
              const log = findLog(rideLogs, trip.appointment.id, trip.date);
              return (
                <li key={trip.appointment.id} className="today-trip">
                  <span>
                    <strong>{formatTime(trip.appointment.time)}</strong> —{' '}
                    {APPOINTMENT_TYPE_LABELS[trip.appointment.type]} at {trip.appointment.clinicName}
                  </span>
                  {log ? (
                    <span className={`badge badge-${rideSeverity(log)}`}>
                      <Icon name="check" size={20} />
                      Checked in: {SEVERITY_DISPLAY[rideSeverity(log)].label}
                    </span>
                  ) : (
                    <SkipDayButton appointment={trip.appointment} date={trip.date} onChange={reload} />
                  )}
                </li>
              );
            })}
          </ul>
          {notCheckedIn.length > 0 && readyToCheckIn && (
            <a href={checkInHref} className="button-primary button-big">
              Check in on today's ride
            </a>
          )}
          {notCheckedIn.length > 0 && !readyToCheckIn && (
            <>
              <p className="checkin-later">
                <Icon name="clock" /> After the ride, come back here to check in.
              </p>
              <a href={checkInHref} className="button-secondary">Check in now</a>
            </>
          )}
          {notCheckedIn.length === 0 && (
            <a href="#/history" className="button-secondary">See ride history</a>
          )}
        </section>
      )}

      <BookingReminders reminders={reminders} onBooked={(r) => markBooked(r.appointment)} />

      {nextTrip && (
        <section className="card" aria-labelledby="next-heading">
          <h2 id="next-heading">{whose(profile)} next appointment</h2>
          <p className="card-title">
            {APPOINTMENT_TYPE_LABELS[nextTrip.appointment.type]} at {nextTrip.appointment.clinicName}
          </p>
          <p className="card-detail">
            {formatLongDate(nextTrip.date)} at {formatTime(nextTrip.appointment.time)}
          </p>
          {nextTrip.appointment.clinicAddress && <p className="card-detail">{nextTrip.appointment.clinicAddress}</p>}
          <BookingStatus appointment={nextTrip.appointment} />
          {/* Skip these buttons if the reminder box above already shows them. */}
          {!nextTrip.appointment.rideBooked && !reminders.some((r) => r.appointment.id === nextTrip.appointment.id) && (
            <div className="button-stack">
              <a href={`tel:${profile.rideCompanyPhone}`} className="button-secondary">
                <Icon name="phone" /> Call {profile.rideCompanyName} to book
              </a>
              <button type="button" className="button-secondary" onClick={() => markBooked(nextTrip.appointment)}>
                <Icon name="check" /> I booked this ride
              </button>
            </div>
          )}
          <SkipDayButton appointment={nextTrip.appointment} date={nextTrip.date} onChange={reload} />
          {nextTrip.appointment.rideBooked && !nextTrip.appointment.confirmationNumber && (
            <p>
              <a href={routeToHash({ name: 'appointment-edit', id: nextTrip.appointment.id })}>
                Add confirmation number
              </a>
            </p>
          )}
        </section>
      )}

      {comingUp.length > 0 && (
        <section aria-labelledby="coming-heading">
          <h2 id="coming-heading">Coming up</h2>
          <ul className="card-list">
            {comingUp.map((trip) => (
              <li key={`${trip.appointment.id}-${trip.date}`} className="card card-compact">
                <span className="card-title">
                  {formatShortDate(trip.date)}, {formatTime(trip.appointment.time)}
                </span>
                <span className="card-detail">
                  {APPOINTMENT_TYPE_LABELS[trip.appointment.type]} at {trip.appointment.clinicName}
                </span>
                <span className={trip.appointment.rideBooked ? 'status status-good' : 'status status-warn'}>
                  <Icon name={trip.appointment.rideBooked ? 'check' : 'warning'} size={20} />
                  {trip.appointment.rideBooked ? 'Booked' : 'Not booked'}
                </span>
                <SkipDayButton appointment={trip.appointment} date={trip.date} onChange={reload} label="Skip this day" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mode === 'real' && needsBackup(rideLogs.length, today) && (
        <section className="card card-info" aria-labelledby="backup-nudge">
          <h2 id="backup-nudge">Keep your records safe</h2>
          <p>You have {rideLogs.length} rides logged, saved only on this phone. Save a backup file in case the phone is lost.</p>
          <a href="#/settings" className="button-secondary">Back up now</a>
        </section>
      )}

      <section className="card" aria-labelledby="company-heading">
        <h2 id="company-heading">Ride company</h2>
        <p className="card-title">{profile.rideCompanyName}</p>
        <a href={`tel:${profile.rideCompanyPhone}`} className="button-secondary">
          <Icon name="phone" /> Call {profile.rideCompanyPhone}
        </a>
      </section>
    </Screen>
  );
}

/** Remind about backups once there's something worth saving and none in the last 30 days. */
function needsBackup(rideCount: number, today: string): boolean {
  if (rideCount < 5) return false;
  const last = loadLastBackupDate();
  return !last || last < addDays(today, -30);
}
