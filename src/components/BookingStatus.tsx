// Shows whether an appointment's ride is booked, using an icon, a word,
// AND a color, so it's clear even without seeing color.
import { t } from '../lib/i18n';
import type { Appointment } from '../types';
import { Icon } from './Icon';

export function BookingStatus({ appointment }: { appointment: Appointment }) {
  if (appointment.rideBooked) {
    return (
      <p className="status status-good">
        <Icon name="check" />
        <span>
          {appointment.confirmationNumber
            ? t('Ride booked — confirmation #{number}', { number: appointment.confirmationNumber })
            : t('Ride booked')}
        </span>
      </p>
    );
  }
  return (
    <p className="status status-warn">
      <Icon name="warning" />
      <span>{t('Ride not booked yet')}</span>
    </p>
  );
}
