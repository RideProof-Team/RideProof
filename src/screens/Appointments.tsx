// ---------------------------------------------------------------------------
// Appointments.tsx — lists every saved appointment, with a button to add one.
// Tapping an appointment opens it for editing.
// One-time appointments that already happened go in a "Past" section.
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { BookingStatus } from '../components/BookingStatus';
import { Screen } from '../components/Screen';
import { Icon } from '../components/Icon';
import { APPOINTMENT_TYPE_LABELS } from '../lib/labels';
import { describeSchedule, isPastAppointment } from '../lib/recurrence';
import { routeToHash } from '../lib/router';
import { useRideData } from '../lib/useRideData';
import type { Appointment } from '../types';

export function Appointments() {
  const { today } = useApp();
  const { data } = useRideData();

  if (!data) return <Screen title="Appointments"><p>Loading…</p></Screen>;

  const { appointments } = data;
  // Recurring first, then one-time appointments by date and time.
  const sorted = [...appointments].sort((a, b) => {
    const aRecurring = a.recurrence.kind === 'weekly' ? 0 : 1;
    const bRecurring = b.recurrence.kind === 'weekly' ? 0 : 1;
    if (aRecurring !== bRecurring) return aRecurring - bRecurring;
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  });
  const current = sorted.filter((a) => !isPastAppointment(a, today));
  const past = sorted.filter((a) => isPastAppointment(a, today)).reverse();

  return (
    <Screen title="Appointments">

      <a href={routeToHash({ name: 'appointment-new' })} className="button-primary">
        <Icon name="plus" /> Add appointment
      </a>

      {appointments.length === 0 && (
        <p className="empty-note">No appointments yet. Add one to start tracking your rides.</p>
      )}

      {current.length > 0 && <AppointmentList title="Upcoming" items={current} />}
      {past.length > 0 && <AppointmentList title="Past" items={past} />}
    </Screen>
  );
}

function AppointmentList({ title, items }: { title: string; items: Appointment[] }) {
  return (
    <section aria-labelledby={`list-${title}`}>
      <h2 id={`list-${title}`}>{title}</h2>
      <ul className="card-list">
        {items.map((appt) => (
          <li key={appt.id}>
            {/* The whole card is one link, so it's one big tap target. */}
            <a href={routeToHash({ name: 'appointment-edit', id: appt.id })} className="card card-link">
              <span className="card-title">
                {APPOINTMENT_TYPE_LABELS[appt.type]} at {appt.clinicName}
              </span>
              <span className="card-detail">{describeSchedule(appt)}</span>
              <BookingStatus appointment={appt} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
