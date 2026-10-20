// ---------------------------------------------------------------------------
// Home.tsx — the main screen. Answers the questions people have most:
//   - Do I have an appointment today? -> big "Check in" button
//   - When is my next appointment, and is the ride booked?
//   - What's coming up after that?
// Booking reminders are added here in Phase 4.
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { BookingStatus } from '../components/BookingStatus';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { formatLongDate, formatShortDate, formatTime } from '../lib/dates';
import { APPOINTMENT_TYPE_LABELS, whose } from '../lib/labels';
import { upcomingTrips, type Trip } from '../lib/recurrence';
import { navigate, routeToHash } from '../lib/router';
import { useAppointments } from '../lib/useAppointments';

/** How many appointments to list under "Coming up". */
const COMING_UP_COUNT = 4;

export function Home() {
  const { profile, today, storage } = useApp();
  const { appointments, reload } = useAppointments();
  if (!profile) return null;
  const title = profile.role === 'caregiver' ? `${profile.riderFirstName}'s rides` : `Hi, ${profile.riderFirstName}`;
  if (!appointments) return <Screen title={title}><p>Loading…</p></Screen>;

  const trips = upcomingTrips(appointments, today);
  const todaysTrips = trips.filter((t) => t.date === today);
  const laterTrips = trips.filter((t) => t.date > today);
  const nextTrip = laterTrips[0];
  const comingUp = laterTrips.slice(1, 1 + COMING_UP_COUNT);

  // One tap to mark a ride as booked, right from Home.
  async function markBooked(trip: Trip) {
    await storage.saveAppointment({ ...trip.appointment, rideBooked: true });
    await reload();
  }

  return (
    <Screen title={title}>
      <p className="today-line">Today is {formatLongDate(today, true)}</p>

      {appointments.length === 0 && (
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
          {todaysTrips.map((trip) => (
            <p key={trip.appointment.id} className="card-detail">
              <strong>{formatTime(trip.appointment.time)}</strong> — {APPOINTMENT_TYPE_LABELS[trip.appointment.type]} at{' '}
              {trip.appointment.clinicName}
            </p>
          ))}
          <button type="button" className="button-primary button-big" onClick={() => navigate({ name: 'checkin' })}>
            Check in on today's ride
          </button>
        </section>
      )}

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
          {!nextTrip.appointment.rideBooked && (
            <div className="button-stack">
              <a href={`tel:${profile.rideCompanyPhone}`} className="button-secondary">
                <Icon name="phone" /> Call {profile.rideCompanyName} to book
              </a>
              <button type="button" className="button-secondary" onClick={() => markBooked(nextTrip)}>
                <Icon name="check" /> I booked this ride
              </button>
            </div>
          )}
          {nextTrip.appointment.rideBooked && !nextTrip.appointment.confirmationNumber && (
            <a href={routeToHash({ name: 'appointment-edit', id: nextTrip.appointment.id })}>
              Add confirmation number
            </a>
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
              </li>
            ))}
          </ul>
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
