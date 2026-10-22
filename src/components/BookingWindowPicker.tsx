// ---------------------------------------------------------------------------
// BookingWindowPicker.tsx — asks how many business days ahead rides must be
// booked. Used in Settings and (optionally) during setup.
//
// Two versions of the question:
//   - The state HAS a rule: show the rule, and offer "use my own number
//     instead" (with a note that the rider's number will be used).
//   - The state has NO rule: ask the rider directly, with "Not sure".
// ---------------------------------------------------------------------------
import { businessDaysText, effectiveBookingWindow, isValidBookingDays, MAX_BOOKING_DAYS, MIN_BOOKING_DAYS } from '../lib/bookingWindow';
import { getStateRule, stateName } from '../lib/stateRules';
import type { Profile, RiderBookingWindow } from '../types';

const NUMBERS = Array.from({ length: MAX_BOOKING_DAYS - MIN_BOOKING_DAYS + 1 }, (_, i) => i + MIN_BOOKING_DAYS);

interface Props {
  id: string;
  /** Only `state` and `riderBookingWindow` are used. */
  profile: Pick<Profile, 'state' | 'riderBookingWindow'>;
  onChange(value: RiderBookingWindow | undefined): void;
}

export function BookingWindowPicker({ id, profile, onChange }: Props) {
  const rule = getStateRule(profile.state);
  const effective = effectiveBookingWindow(profile as Profile, rule);
  const riderDays = isValidBookingDays(profile.riderBookingWindow) ? profile.riderBookingWindow : null;
  const noteId = `${id}-note`;

  // The <select> needs text values; "" means "use the state's rule" or "not sure".
  const selectValue = riderDays !== null ? String(riderDays) : rule ? '' : 'not_sure';
  function handleChange(text: string) {
    if (text === '') onChange(undefined);
    else if (text === 'not_sure') onChange('not_sure');
    else onChange(Number(text));
  }

  return (
    <div className="field">
      {rule ? (
        <>
          <p className="field-hint">
            {rule.name}'s rule{rule.isPlaceholder ? ' (a placeholder — check your state Medicaid website)' : ''}: book at least{' '}
            <strong>{businessDaysText(rule.bookingWindowBusinessDays)}</strong> ahead.
          </p>
          <label htmlFor={id}>Use my own number instead (optional)</label>
        </>
      ) : (
        <label htmlFor={id}>How many business days ahead does your ride company require you to book?</label>
      )}
      <select id={id} value={selectValue} onChange={(e) => handleChange(e.target.value)} aria-describedby={noteId}>
        {rule ? (
          <option value="">Use {rule.name}'s rule ({businessDaysText(rule.bookingWindowBusinessDays)})</option>
        ) : (
          <option value="not_sure">Not sure</option>
        )}
        {NUMBERS.map((n) => (
          <option key={n} value={n}>{businessDaysText(n)}</option>
        ))}
      </select>
      <p id={noteId} className="field-hint">
        {effective.source === 'rider' && rule && (
          <>RideConnect will use your number ({businessDaysText(effective.days!)}) instead of {rule.name}'s rule.</>
        )}
        {effective.source === 'rider' && !rule && (
          <>RideConnect will remind you to book {businessDaysText(effective.days!)} before each appointment.</>
        )}
        {effective.source === 'state' && <>Booking reminders use {rule!.name}'s rule.</>}
        {effective.source === 'none' && (
          <>
            RideConnect doesn't have {stateName(profile.state) || "your state"}'s rules yet, so booking reminders are off until you
            choose a number. Your ride company or member handbook can tell you.
          </>
        )}
      </p>
    </div>
  );
}
