// ---------------------------------------------------------------------------
// SkipDayButton.tsx — "Cancelled? Skip this day" for one trip.
// Marks just that one date as not happening (the rest of a repeating
// schedule stays), then offers "Undo".
// ---------------------------------------------------------------------------
import { useApp } from '../AppContext';
import { formatLongDate } from '../lib/dates';
import { showSnackbar } from '../lib/feedback';
import { t } from '../lib/i18n';
import { skipTrip } from '../lib/recurrence';
import type { Appointment } from '../types';

interface Props {
  appointment: Appointment;
  date: string;
  /** Called after saving, so the screen can reload. */
  onChange(): void;
  label?: string;
}

export function SkipDayButton({ appointment, date, onChange, label = t('Cancelled? Skip this day') }: Props) {
  const { storage } = useApp();

  async function skip() {
    await storage.saveAppointment(skipTrip(appointment, date));
    onChange();
    showSnackbar(t('Skipped {date}.', { date: formatLongDate(date) }), {
      label: t('Undo'),
      run: async () => {
        await storage.saveAppointment(appointment);
        onChange();
      },
    });
  }

  return (
    <button type="button" className="link-button" onClick={skip}>
      {label}
      <span className="visually-hidden"> ({formatLongDate(date)})</span>
    </button>
  );
}
