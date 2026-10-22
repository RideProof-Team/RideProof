// ---------------------------------------------------------------------------
// History.tsx — every logged ride, newest first, grouped by month.
// Each ride is color-coded (green / yellow / red) AND shows an icon and a
// word ("On time", "Late", "Problem"), so color is never the only signal.
// At the top, any recent trips that were never checked in on.
// Calls to book a ride that didn't work are listed too (as problems), on
// the day of the call.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SkipDayButton } from '../components/SkipDayButton';
import { tripsNeedingCheckIn } from '../lib/checkinFlow';
import { capitalize, formatLongDate, formatMonthYear, formatTime } from '../lib/dates';
import { t, tn } from '../lib/i18n';
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
import { showSnackbar } from '../lib/feedback';
import { useRideData } from '../lib/useRideData';
import type { FailedBooking, RideLog } from '../types';
import { FAIL_REASON_LABELS } from '../lib/bookingAttempts';

/** One row in History: a ride, or a failed booking call. */
type HistoryItem = { kind: 'ride'; date: string; log: RideLog } | { kind: 'call'; date: string; attempt: FailedBooking };

/** Show at most this many "needs a check-in" trips. */
const MAX_UNLOGGED = 5;

export function History() {
  const { today, storage } = useApp();
  const { data, reload } = useRideData();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [search, setSearch] = useState('');
  if (!data) return <Screen title={t('Ride history')}><p>{t('Loading…')}</p></Screen>;

  const unlogged = tripsNeedingCheckIn(data.appointments, data.rideLogs, today).slice(0, MAX_UNLOGGED);
  // Newest first. Text dates sort correctly, so we can compare them directly.
  const allLogs = [...data.rideLogs].sort((a, b) => b.rideDate.localeCompare(a.rideDate));
  const logs = filterLogs(allLogs, filter, search);
  const filtering = filter !== 'all' || search.trim() !== '';
  // Failed booking calls are problems, so they show under "All" and "Problems only".
  const words = search.trim().toLowerCase();
  const calls = data.bookingAttempts.filter(
    (a) => (filter === 'all' || filter === 'problems') && (!words || `${a.clinicName} ${a.details}`.toLowerCase().includes(words)),
  );
  const items: HistoryItem[] = [
    ...logs.map((log): HistoryItem => ({ kind: 'ride', date: log.rideDate, log })),
    ...calls.map((attempt): HistoryItem => ({ kind: 'call', date: attempt.attemptedOn, attempt })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Group into months: { "October 2026": [...], "September 2026": [...] }
  const months = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const month = formatMonthYear(item.date);
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(item);
  }

  return (
    <Screen title={t('Ride history')}>
      {unlogged.length > 0 && (
        <section aria-labelledby="unlogged-heading" className="card card-today">
          <h2 id="unlogged-heading">{t('Needs a check-in')}</h2>
          <ul className="plain-list">
            {unlogged.map((trip) => (
              <li key={`${trip.appointment.id}-${trip.date}`}>
                <a
                  className="button-secondary"
                  href={routeToHash({ name: 'checkin', appointmentId: trip.appointment.id, date: trip.date })}
                >
                  {capitalize(formatLongDate(trip.date))}, {formatTime(trip.appointment.time)}
                  {' — '}
                  {t(APPOINTMENT_TYPE_LABELS[trip.appointment.type])}
                </a>
                <SkipDayButton
                  appointment={trip.appointment}
                  date={trip.date}
                  onChange={reload}
                  label={t('No appointment that day? Skip it')}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {(allLogs.length > 0 || data.bookingAttempts.length > 0) && (
        <div className="history-tools">
          <div className="field search-field">
            <label htmlFor="history-search">
              <Icon name="search" /> {t('Search notes and clinics')}
            </label>
            <input id="history-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <fieldset className="choice-group">
            <legend>{t('Show')}</legend>
            <div className="chip-row">
              {(Object.keys(HISTORY_FILTER_LABELS) as HistoryFilter[]).map((value) => (
                <label key={value} className="chip">
                  <input type="radio" name="history-filter" checked={filter === value} onChange={() => setFilter(value)} />
                  <span>{t(HISTORY_FILTER_LABELS[value])}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {/* aria-live: screen readers hear the new count as filters change. */}
          <p className="filter-count" aria-live="polite">
            {filtering
              ? t('Showing {shown} of {total} rides.', { shown: logs.length, total: allLogs.length })
              : tn(allLogs.length, '{n} ride logged.', '{n} rides logged.')}
            {calls.length > 0 && ` ${tn(calls.length, "{n} booking call that didn't work.", "{n} booking calls that didn't work.")}`}
          </p>
          {filtering && logs.length === 0 && (
            <button type="button" className="link-button" onClick={() => { setFilter('all'); setSearch(''); }}>
              {t('No rides match. Show all rides')}
            </button>
          )}
        </div>
      )}

      {allLogs.length === 0 && data.bookingAttempts.length === 0 && (
        <p className="empty-note">
          {t('No rides logged yet. After each ride, tap "Check in on today\'s ride" on the Home screen.')}
        </p>
      )}

      {[...months.entries()].map(([month, monthItems]) => (
        <section key={month} aria-labelledby={`month-${month}`}>
          <h2 id={`month-${month}`}>{month}</h2>
          <ul className="card-list">
            {monthItems.map((item) =>
              item.kind === 'ride'
                ? <RideCard key={item.log.id} log={item.log} />
                : <CallCard key={item.attempt.id} attempt={item.attempt} onDelete={async () => {
                    await storage.deleteBookingAttempt(item.attempt.id);
                    await reload();
                    showSnackbar(t('Booking call record deleted.'), {
                      label: t('Undo'),
                      run: async () => {
                        await storage.saveBookingAttempt(item.attempt);
                        await reload();
                      },
                    });
                  }} />,
            )}
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
      ? t('Late ({minutes})', { minutes: t(MINUTES_LATE_SHORT[log.minutesLate]) })
      : t(PICKUP_LABELS[log.pickupStatus]);

  return (
    <li className={`card ride-card sev-${severity}`}>
      <div className="ride-card-top">
        <span className="card-title">{capitalize(formatLongDate(log.rideDate))}</span>
        <span className={`badge badge-${severity}`}>
          <Icon name={display.icon} size={20} />
          {t(display.label)}
        </span>
      </div>
      <span className="card-detail">
        {t('{type} at {clinic}', { type: t(APPOINTMENT_TYPE_LABELS[log.appointmentType]), clinic: log.clinicName })}
      </span>
      {severity !== 'good' && <p className="ride-reason">{severityReason(log)}</p>}
      <dl className="ride-details">
        <dt>{t('Pickup')}</dt>
        <dd>
          {pickup}
          {pickupTimesText(log) && <><br />{pickupTimesText(log)}</>}
        </dd>
        <dt>{t('Appointment')}</dt>
        <dd>{t(OUTCOME_LABELS[log.appointmentOutcome])}</dd>
        <dt>{t('Ride home')}</dt>
        <dd>
          {log.returnRideStatus === 'late' && log.returnMinutesLate
            ? t('Late ({minutes})', { minutes: t(MINUTES_LATE_SHORT[log.returnMinutesLate]) })
            : t(RETURN_LABELS[log.returnRideStatus])}
        </dd>
        {log.notes && (
          <>
            <dt>{t('Notes')}</dt>
            <dd>{log.notes}</dd>
          </>
        )}
      </dl>
      <a href={routeToHash({ name: 'checkin', appointmentId: log.appointmentId, date: log.rideDate })}>
        {t('Edit this ride')}
        <span className="visually-hidden"> {t('on {date}', { date: formatLongDate(log.rideDate) })}</span>
      </a>
    </li>
  );
}

/** A call to book a ride that didn't work. Shown as a problem (red), with words and an icon. */
function CallCard({ attempt, onDelete }: { attempt: FailedBooking; onDelete(): void }) {
  return (
    <li className="card ride-card sev-problem">
      <div className="ride-card-top">
        <span className="card-title">{capitalize(formatLongDate(attempt.attemptedOn))}</span>
        <span className="badge badge-problem">
          <Icon name="phone" size={20} />
          {t("Couldn't book")}
        </span>
      </div>
      <span className="card-detail">
        {t('Call to book the ride for {type} at {clinic}, {date}', {
          type: t(APPOINTMENT_TYPE_LABELS[attempt.appointmentType]),
          clinic: attempt.clinicName,
          date: formatLongDate(attempt.tripDate),
        })}
      </span>
      <dl className="ride-details">
        <dt>{t('What happened')}</dt>
        <dd>{t(FAIL_REASON_LABELS[attempt.reason])}</dd>
        {attempt.details && (
          <>
            <dt>{t('Details')}</dt>
            <dd>{attempt.details}</dd>
          </>
        )}
      </dl>
      <button type="button" className="link-button" onClick={onDelete}>
        {t('Delete this record')}
        <span className="visually-hidden"> {t('of the call on {date}', { date: formatLongDate(attempt.attemptedOn) })}</span>
      </button>
    </li>
  );
}
