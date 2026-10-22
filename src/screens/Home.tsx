// ---------------------------------------------------------------------------
// Home.tsx — the main screen. Answers the questions people have most:
//   - Do I have an appointment today? -> big "Check in" button
//   - When is my next appointment, and is the ride booked?
//   - What's coming up after that?
//   - Is a ride booking deadline coming up? -> reminder with Call button
//   - Was a complaint sent 14+ days ago with no answer? -> "Did you hear back?"
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { BookingReminders } from '../components/BookingReminders';
import { BookingStatus } from '../components/BookingStatus';
import { CheckInNudge } from '../components/CheckInNudge';
import { ClinicActions } from '../components/ClinicActions';
import { GettingStarted } from '../components/GettingStarted';
import { InstallCard } from '../components/PwaPrompts';
import { SkipDayButton } from '../components/SkipDayButton';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { findLog } from '../lib/checkinFlow';
import { getNowTime } from '../lib/clock';
import { introHidden } from '../lib/onboarding';
import { addDays, capitalize, formatLongDate, formatShortDate, formatTime } from '../lib/dates';
import { t } from '../lib/i18n';
import { APPOINTMENT_TYPE_LABELS } from '../lib/labels';
import { upcomingTrips } from '../lib/recurrence';
import { bookingReminders } from '../lib/reminders';
import { SEVERITY_DISPLAY, rideSeverity } from '../lib/rideStatus';
import { loadLastBackupDate } from '../lib/backup';
import { showSnackbar } from '../lib/feedback';
import { routeToHash } from '../lib/router';
import { effectiveBookingWindow } from '../lib/bookingWindow';
import { getStateRule } from '../lib/stateRules';
import type { Appointment } from '../types';
import { useRideData } from '../lib/useRideData';
import { useNow } from '../lib/useNow';
import { TripTimers } from '../components/TripTimers';
import { ComplaintFollowUps } from '../components/ComplaintFollowUps';
import { dueFollowUps } from '../lib/complaints';

/** How many appointments to list under "Coming up". */
const COMING_UP_COUNT = 4;

export function Home() {
  const { profile, today, storage, mode } = useApp();
  const { data, reload } = useRideData();
  // Redraw every 30 seconds, so the timer buttons appear on time.
  const now = useNow(30_000);
  if (!profile) return null;
  const isCaregiver = profile.role === 'caregiver';
  const name = profile.riderFirstName;
  const title = isCaregiver ? t("{name}'s rides", { name }) : t('Hi, {name}', { name });
  if (!data) return <Screen title={title}><p>{t('Loading…')}</p></Screen>;
  const { appointments, rideLogs, waits, complaints } = data;

  const trips = upcomingTrips(appointments, today);
  const todaysTrips = trips.filter((trip) => trip.date === today);
  const notCheckedIn = todaysTrips.filter((trip) => !findLog(rideLogs, trip.appointment.id, trip.date));
  // Is it after the appointment time yet? Then the ride has happened (or should have).
  const nowTime = getNowTime(mode);
  const readyToCheckIn = notCheckedIn.some((trip) => trip.appointment.time <= nowTime);
  const laterTrips = trips.filter((trip) => trip.date > today);
  const nextTrip = laterTrips[0];
  const comingUp = laterTrips.slice(1, 1 + COMING_UP_COUNT);
  // Rider's own number first, then the state's rule, else no reminders.
  const bookingWindow = effectiveBookingWindow(profile, getStateRule(profile.state));
  const reminders = bookingWindow.days !== null ? bookingReminders(appointments, today, bookingWindow.days) : [];
  // Reminders are off only because we don't know the booking window: say so.
  const remindersOff = bookingWindow.source === 'none' && appointments.some((a) => !a.rideBooked);

  // One tap to mark a ride as booked, right from Home.
  async function markBooked(appointment: Appointment) {
    await storage.saveAppointment({ ...appointment, rideBooked: true });
    await reload();
    showSnackbar(t('Marked as booked.'), {
      label: t('Undo'),
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

  /** "Dialysis at Lakeside Clinic" */
  const typeAt = (appointment: Appointment) =>
    t('{type} at {clinic}', { type: t(APPOINTMENT_TYPE_LABELS[appointment.type]), clinic: appointment.clinicName });

  return (
    <Screen title={title} className="screen-dashboard">
      <p className="today-line">{t('Today is {date}', { date: formatLongDate(today, true) })}</p>

      {mode === 'real' && <GettingStarted hasAppointments={appointments.length > 0} hasCheckIns={rideLogs.length > 0} />}
      {mode === 'real' && <CheckInNudge trips={notCheckedIn} />}

      {appointments.length === 0 && introHidden() && (
        <section className="card">
          <h2>{t('Get started')}</h2>
          <p>
            {isCaregiver
              ? t("Add {name}'s medical appointments so RideConnect can track the rides.", { name })
              : t('Add your medical appointments so RideConnect can track the rides.')}
          </p>
          <a href={routeToHash({ name: 'appointment-new' })} className="button-primary">
            <Icon name="plus" /> {t('Add an appointment')}
          </a>
        </section>
      )}

      {todaysTrips.length > 0 && (
        <section className="card card-today" aria-labelledby="today-heading">
          <h2 id="today-heading">{t('Today')}</h2>
          <ul className="plain-list">
            {todaysTrips.map((trip) => {
              const log = findLog(rideLogs, trip.appointment.id, trip.date);
              return (
                <li key={trip.appointment.id} className="today-trip">
                  <span>
                    <strong>{formatTime(trip.appointment.time)}</strong> —{' '}
                    {typeAt(trip.appointment)}
                  </span>
                  {log && (
                    <span className={`badge badge-${rideSeverity(log)}`}>
                      <Icon name="check" size={20} />
                      {t('Checked in: {status}', { status: t(SEVERITY_DISPLAY[rideSeverity(log)].label) })}
                    </span>
                  )}
                  <TripTimers trip={trip} log={log} waits={waits} now={now} />
                </li>
              );
            })}
          </ul>
          {notCheckedIn.length > 0 && readyToCheckIn && (
            <a href={checkInHref} className="button-primary button-big">
              {t("Check in on today's ride")}
            </a>
          )}
          {notCheckedIn.length > 0 && !readyToCheckIn && (
            <>
              <p className="checkin-later">
                <Icon name="clock" /> {t('After the ride, come back here to check in.')}
              </p>
              <a href={checkInHref} className="button-secondary">{t('Check in now')}</a>
            </>
          )}
          {notCheckedIn.length === 0 && (
            <a href="#/history" className="button-secondary">{t('See ride history')}</a>
          )}
          {/* Helpful extras go below the main button, so it stays easy to find. */}
          {notCheckedIn.map((trip) => (
            <div key={trip.appointment.id} className="today-extras">
              <ClinicActions appointment={trip.appointment} />
              <SkipDayButton appointment={trip.appointment} date={trip.date} onChange={reload} />
            </div>
          ))}
        </section>
      )}

      <BookingReminders reminders={reminders} attempts={data.bookingAttempts} onBooked={(r) => markBooked(r.appointment)} />
      <ComplaintFollowUps due={dueFollowUps(complaints, today)} onChange={reload} />
      {remindersOff && (
        <section className="card card-info" aria-labelledby="reminders-off-heading">
          <h2 id="reminders-off-heading">
            <Icon name="clock" /> {t('Booking reminders are off')}
          </h2>
          <p>{t('Tell RideConnect how many business days ahead your ride company needs, and it will remind you when to book.')}</p>
          <a href="#/settings" className="button-secondary">{t('Set up booking reminders')}</a>
        </section>
      )}

      {nextTrip && (
        <section className="card" aria-labelledby="next-heading">
          <h2 id="next-heading">{isCaregiver ? t("{name}'s next appointment", { name }) : t('Your next appointment')}</h2>
          <p className="card-title">{typeAt(nextTrip.appointment)}</p>
          <p className="card-detail">
            {capitalize(t('{date} at {time}', { date: formatLongDate(nextTrip.date), time: formatTime(nextTrip.appointment.time) }))}
          </p>
          {nextTrip.appointment.clinicAddress && <p className="card-detail">{nextTrip.appointment.clinicAddress}</p>}
          <ClinicActions appointment={nextTrip.appointment} />
          <BookingStatus appointment={nextTrip.appointment} />
          {/* Skip these buttons if the reminder box above already shows them. */}
          {!nextTrip.appointment.rideBooked && !reminders.some((r) => r.appointment.id === nextTrip.appointment.id) && (
            <div className="button-stack">
              <a href={routeToHash({ name: 'call', appointmentId: nextTrip.appointment.id, date: nextTrip.date })} className="button-secondary">
                <Icon name="phone" /> {t('Call {company} to book', { company: profile.rideCompanyName })}
              </a>
              <button type="button" className="button-secondary" onClick={() => markBooked(nextTrip.appointment)}>
                <Icon name="check" /> {t('I booked this ride')}
              </button>
            </div>
          )}
          <SkipDayButton appointment={nextTrip.appointment} date={nextTrip.date} onChange={reload} />
          {nextTrip.appointment.rideBooked && !nextTrip.appointment.confirmationNumber && (
            <p>
              <a href={routeToHash({ name: 'appointment-edit', id: nextTrip.appointment.id })}>
                {t('Add confirmation number')}
              </a>
            </p>
          )}
        </section>
      )}

      {comingUp.length > 0 && (
        <section aria-labelledby="coming-heading">
          <h2 id="coming-heading">{t('Coming up')}</h2>
          <ul className="card-list">
            {comingUp.map((trip) => (
              <li key={`${trip.appointment.id}-${trip.date}`} className="card card-compact">
                <span className="card-title">
                  {formatShortDate(trip.date)}, {formatTime(trip.appointment.time)}
                </span>
                <span className="card-detail">{typeAt(trip.appointment)}</span>
                <span className={trip.appointment.rideBooked ? 'status status-good' : 'status status-warn'}>
                  <Icon name={trip.appointment.rideBooked ? 'check' : 'warning'} size={20} />
                  {trip.appointment.rideBooked ? t('Booked') : t('Not booked')}
                </span>
                <SkipDayButton appointment={trip.appointment} date={trip.date} onChange={reload} label={t('Skip this day')} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mode === 'real' && <InstallCard />}

      {mode === 'real' && needsBackup(rideLogs.length, today) && (
        <section className="card card-info" aria-labelledby="backup-nudge">
          <h2 id="backup-nudge">{t('Keep your records safe')}</h2>
          <p>{t('You have {n} rides logged, saved only on this phone. Save a backup file in case the phone is lost.', { n: rideLogs.length })}</p>
          <a href="#/settings" className="button-secondary">{t('Back up now')}</a>
        </section>
      )}

      <section className="card" aria-labelledby="company-heading">
        <h2 id="company-heading">{t('Ride company')}</h2>
        <p className="card-title">{profile.rideCompanyName}</p>
        <a href={`tel:${profile.rideCompanyPhone}`} className="button-secondary">
          <Icon name="phone" /> {t('Call {name}', { name: profile.rideCompanyPhone })}
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
