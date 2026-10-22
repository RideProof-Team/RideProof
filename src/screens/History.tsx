// ---------------------------------------------------------------------------
// History.tsx — every logged ride, newest first, grouped by month.
// Each ride is color-coded (green / yellow / red) AND shows an icon and a
// word ("On time", "Late", "Problem"), so color is never the only signal.
// At the top, any recent trips that were never checked in on.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SkipDayButton } from '../components/SkipDayButton';
import { tripsNeedingCheckIn } from '../lib/checkinFlow';
import { formatLongDate, formatTime, parseDate } from '../lib/dates';
import { pickupTimesText } from '../lib/complaintLetter';
import {
  APPOINTMENT_TYPE_LABELS,
  MINUTES_LATE_SHORT,
  OUTCOME_LABELS,
  PICKUP_LABELS,
  RETURN_LABELS,
} from '../lib/labels';
import {
  filterLogs,
  HISTORY_FILTER_LABELS,
  rideSeverity,
  severityReason,
  SEVERITY_DISPLAY,
  type HistoryFilter,
} from '../lib/rideStatus';
import { routeToHash } from '../lib/router';
import { useRideData } from '../lib/useRideData';
import type { RideLog } from '../types';

/** Show at most this many "needs a check-in" trips. */
const MAX_UNLOGGED = 5;

export function History() {
  const { today } = useApp();
  const { data, reload } = useRideData();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [search, setSearch] = useState('');
  if (!data) return <Screen title="Ride history"><p>Loading…</p></Screen>;

  const unlogged = tripsNeedingCheckIn(data.appointments, data.rideLogs, today).slice(0, MAX_UNLOGGED);
  // Newest first. Text dates sort correctly, so we can compare them directly.
  const allLogs = [...data.rideLogs].sort((a, b) => b.rideDate.localeCompare(a.rideDate));
  const logs = filterLogs(allLogs, filter, search);
  const filtering = filter !== 'all' || search.trim() !== '';

  // Group into months: { "October 2026": [...], "September 2026": [...] }
  const months = new Map<string, RideLog[]>();
  for (const log of logs) {
    const month = parseDate(log.rideDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(log);
  }

  return (
    <Screen title="Ride history">
      {unlogged.length > 0 && (
        <section aria-labelledby="unlogged-heading" className="card card-today">
          <h2 id="unlogged-heading">Needs a check-in</h2>
          <ul className="plain-list">
            {unlogged.map((trip) => (
              <li key={`${trip.appointment.id}-${trip.date}`}>
                <a
                  className="button-secondary"
                  href={routeToHash({ name: 'checkin', appointmentId: trip.appointment.id, date: trip.date })}
                >
                  {formatLongDate(trip.date)}, {formatTime(trip.appointment.time)}
                  {' — '}
                  {APPOINTMENT_TYPE_LABELS[trip.appointment.type]}
                </a>
                <SkipDayButton
                  appointment={trip.appointment}
                  date={trip.date}
                  onChange={reload}
                  label="No appointment that day? Skip it"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {allLogs.length > 0 && (
        <div className="history-tools">
          <div className="field search-field">
            <label htmlFor="history-search">
              <Icon name="search" /> Search notes and clinics
            </label>
            <input id="history-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <fieldset className="choice-group">
            <legend>Show</legend>
            <div className="chip-row">
              {(Object.keys(HISTORY_FILTER_LABELS) as HistoryFilter[]).map((value) => (
                <label key={value} className="chip">
                  <input type="radio" name="history-filter" checked={filter === value} onChange={() => setFilter(value)} />
                  <span>{HISTORY_FILTER_LABELS[value]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {/* aria-live: screen readers hear the new count as filters change. */}
          <p className="filter-count" aria-live="polite">
            {filtering ? `Showing ${logs.length} of ${allLogs.length} rides.` : `${allLogs.length} rides logged.`}
          </p>
          {filtering && logs.length === 0 && (
            <button type="button" className="link-button" onClick={() => { setFilter('all'); setSearch(''); }}>
              No rides match. Show all rides
            </button>
          )}
        </div>
      )}

      {allLogs.length === 0 && (
        <p className="empty-note">
          No rides logged yet. After each ride, tap "Check in on today's ride" on the Home screen.
        </p>
      )}

      {[...months.entries()].map(([month, monthLogs]) => (
        <section key={month} aria-labelledby={`month-${month}`}>
          <h2 id={`month-${month}`}>{month}</h2>
          <ul className="card-list">
            {monthLogs.map((log) => <RideCard key={log.id} log={log} />)}
          </ul>
        </section>
      ))}
    </Screen>
  );
}

function RideCard({ log }: { log: RideLog }) {
  const severity = rideSeverity(log);
  const display = SEVERITY_DISPLAY[severity];
  const pickup =
    log.pickupStatus === 'late' && log.minutesLate
      ? `Late (${MINUTES_LATE_SHORT[log.minutesLate]})`
      : PICKUP_LABELS[log.pickupStatus];

  return (
    <li className={`card ride-card sev-${severity}`}>
      <div className="ride-card-top">
        <span className="card-title">{formatLongDate(log.rideDate)}</span>
        <span className={`badge badge-${severity}`}>
          <Icon name={display.icon} size={20} />
          {display.label}
        </span>
      </div>
      <span className="card-detail">
        {APPOINTMENT_TYPE_LABELS[log.appointmentType]} at {log.clinicName}
      </span>
      {severity !== 'good' && <p className="ride-reason">{severityReason(log)}</p>}
      <dl className="ride-details">
        <dt>Pickup</dt>
        <dd>
          {pickup}
          {pickupTimesText(log) && <><br />{pickupTimesText(log)}</>}
        </dd>
        <dt>Appointment</dt>
        <dd>{OUTCOME_LABELS[log.appointmentOutcome]}</dd>
        <dt>Ride home</dt>
        <dd>
          {log.returnRideStatus === 'late' && log.returnMinutesLate
            ? `Late (${MINUTES_LATE_SHORT[log.returnMinutesLate]})`
            : RETURN_LABELS[log.returnRideStatus]}
        </dd>
        {log.notes && (
          <>
            <dt>Notes</dt>
            <dd>{log.notes}</dd>
          </>
        )}
      </dl>
      <a href={routeToHash({ name: 'checkin', appointmentId: log.appointmentId, date: log.rideDate })}>
        Edit this ride<span className="visually-hidden"> on {formatLongDate(log.rideDate)}</span>
      </a>
    </li>
  );
}
