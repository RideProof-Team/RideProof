// ---------------------------------------------------------------------------
// ClinicActions.tsx — one-tap "Directions" and "Call clinic" buttons.
// Directions open the phone's maps app: Apple Maps on iPhone/iPad/Mac,
// Google Maps everywhere else. (Tapping sends the address to that maps
// service; nothing is sent unless the user taps.)
// ---------------------------------------------------------------------------
import type { Appointment } from '../types';
import { Icon } from './Icon';

export function mapsLink(address: string): string {
  const query = encodeURIComponent(address);
  const isApple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return isApple ? `https://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function ClinicActions({ appointment }: { appointment: Appointment }) {
  const { clinicAddress, clinicPhone, clinicName } = appointment;
  if (!clinicAddress && !clinicPhone) return null;
  return (
    <div className="clinic-actions">
      {clinicAddress && (
        <a href={mapsLink(clinicAddress)} target="_blank" rel="noreferrer" className="button-secondary">
          <Icon name="map" /> Directions<span className="visually-hidden"> to {clinicName} (opens maps)</span>
        </a>
      )}
      {clinicPhone && (
        <a href={`tel:${clinicPhone}`} className="button-secondary">
          <Icon name="phone" /> Call clinic<span className="visually-hidden"> {clinicName}</span>
        </a>
      )}
    </div>
  );
}
