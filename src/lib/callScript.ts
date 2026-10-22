// ---------------------------------------------------------------------------
// callScript.ts — "What to say" when calling the ride company to book.
//
// Phone calls to book rides are stressful: long holds, and the agent asks
// for details fast. This builds a short script from the appointment and
// the profile, so the rider can read it out. Anything RideConnect doesn't
// know is shown in [brackets], so it's clear what to fill in.
// RideConnect never stores a Medicaid ID, so that is always in brackets.
// ---------------------------------------------------------------------------
import type { Appointment, MobilityNeeds, Profile } from '../types';
import { formatLongDate, formatTime } from './dates';
import { getLanguage, msg, t } from './i18n';
import { ESTIMATED_PICKUP_LEAD_MINUTES, minutesOfDay, timeFromMinutes } from './waitTimer';

export const MOBILITY_LABELS: Record<MobilityNeeds, string> = {
  none: msg('No special needs'),
  walker: msg('Uses a walker'),
  wheelchair: msg('Uses a wheelchair'),
  needs_help: msg('Needs help getting to and into the vehicle'),
};

/** "The dialysis appointment is on ..." (one whole sentence per kind, so Spanish reads naturally). */
const APPOINTMENT_SENTENCES: Record<Appointment['type'], string> = {
  dialysis: msg('The dialysis appointment is on {date} at {time}.'),
  checkup: msg('The checkup appointment is on {date} at {time}.'),
  specialist: msg('The specialist appointment is on {date} at {time}.'),
  therapy: msg('The therapy appointment is on {date} at {time}.'),
  other: msg('The medical appointment is on {date} at {time}.'),
};

/**
 * A time as it fits after "at": "9:00 AM". Spanish needs the article:
 * "las 9:00 a. m." (or "la 1:00 p. m."), so the Spanish text says "a {time}".
 */
export function atTime(time: string): string {
  const formatted = formatTime(time);
  if (getLanguage() !== 'es') return formatted;
  const hour = Number(time.split(':')[0]) % 12;
  return `${hour === 1 ? 'la' : 'las'} ${formatted}`;
}

/**
 * Spanish times end in a period ("9:00 a. m."), so a sentence that ends
 * with one would get two: "a las 9:00 a. m..". This keeps just one.
 */
export function onePeriod(sentence: string): string {
  return sentence.replace(/([ap])\. m\.\./g, '$1. m.');
}

/**
 * The suggested pickup time: the one the ride company gave (if saved),
 * otherwise 60 minutes before the appointment.
 */
export function suggestedPickup(appointment: Appointment): string {
  if (appointment.pickupTime) return appointment.pickupTime;
  return timeFromMinutes(Math.max(0, minutesOfDay(appointment.time) - ESTIMATED_PICKUP_LEAD_MINUTES));
}

export interface CallScriptInput {
  profile: Profile;
  appointment: Appointment;
  /** "YYYY-MM-DD" of the trip being booked. */
  tripDate: string;
  /** "HH:MM", editable on the screen. Empty = [pickup time]. */
  pickupTime: string;
  /** "HH:MM" for the ride home. Empty = [time you'll be ready]. */
  returnTime: string;
  /** True if no ride home is needed. */
  noReturnRide: boolean;
  /** Anything else to tell the ride company. */
  notes: string;
}

/** Text if it's filled in, or a [bracketed reminder] (already translated) if not. */
function orBlank(value: string | undefined, blank: string): string {
  return value && value.trim() ? value.trim() : blank;
}

function mobilitySentence(needs: MobilityNeeds | undefined, isRider: boolean, name: string): string {
  switch (needs) {
    case 'none':
      return isRider ? t("I don't need any special help with the vehicle.") : t("{name} doesn't need any special help with the vehicle.", { name });
    case 'walker':
      return isRider ? t('I use a walker.') : t('{name} uses a walker.', { name });
    case 'wheelchair':
      return isRider
        ? t('I use a wheelchair and need a wheelchair-accessible vehicle.')
        : t('{name} uses a wheelchair and needs a wheelchair-accessible vehicle.', { name });
    case 'needs_help':
      return isRider ? t('I need help getting to and into the vehicle.') : t('{name} needs help getting to and into the vehicle.', { name });
    default:
      return t('[Any mobility needs, like a walker or wheelchair]');
  }
}

/** The script, one sentence per line, ready to read out or copy. */
export function buildCallScript(input: CallScriptInput): string {
  const { profile, appointment, tripDate } = input;
  const isRider = profile.role === 'rider';
  const rider = profile.riderFirstName;
  const caller = isRider ? rider : orBlank(profile.caregiverName, t('[your name]'));
  const address = orBlank(profile.homeAddress, t('[home address]'));
  const pickup = input.pickupTime ? atTime(input.pickupTime) : t('[pickup time]');
  const ready = input.returnTime ? atTime(input.returnTime) : t("[time you'll be ready]");
  const lines = [
    isRider
      ? t("Hi, my name is {name}. I'm calling to book a Medicaid ride.", { name: caller })
      : t("Hi, my name is {name}. I'm calling to book a Medicaid ride for {rider}.", { name: caller, rider }),
    isRider
      ? t('My Medicaid ID number is [Medicaid ID number].')
      : t("{rider}'s Medicaid ID number is [Medicaid ID number].", { rider }),
    onePeriod(t(APPOINTMENT_SENTENCES[appointment.type], { date: formatLongDate(tripDate, true), time: atTime(appointment.time) })),
    t("It's at {clinic}, {address}.", {
      clinic: appointment.clinicName,
      address: orBlank(appointment.clinicAddress, t('[clinic address]')),
    }),
    onePeriod(
      isRider
        ? t('Please pick me up at {address} at {time}.', { address, time: pickup })
        : t('Please pick {rider} up at {address} at {time}.', { rider, address, time: pickup }),
    ),
    input.noReturnRide
      ? isRider
        ? t("I won't need a ride home.")
        : t("{rider} won't need a ride home.", { rider })
      : onePeriod(
          isRider
            ? t('I will also need a ride home at {time}.', { time: ready })
            : t('{rider} will also need a ride home at {time}.', { rider, time: ready }),
        ),
    mobilitySentence(profile.mobilityNeeds, isRider, rider),
  ];
  if (input.notes.trim()) lines.push(t('Also: {notes}', { notes: input.notes.trim() }));
  lines.push(t('Can you read back the pickup time and give me a confirmation number?'));
  return lines.join('\n');
}
