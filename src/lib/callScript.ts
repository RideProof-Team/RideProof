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
import { ESTIMATED_PICKUP_LEAD_MINUTES, minutesOfDay, timeFromMinutes } from './waitTimer';

export const MOBILITY_LABELS: Record<MobilityNeeds, string> = {
  none: 'No special needs',
  walker: 'Uses a walker',
  wheelchair: 'Uses a wheelchair',
  needs_help: 'Needs help getting to and into the vehicle',
};

/** "The dialysis appointment", "The medical appointment". */
const APPOINTMENT_WORDS: Record<Appointment['type'], string> = {
  dialysis: 'dialysis',
  checkup: 'checkup',
  specialist: 'specialist',
  therapy: 'therapy',
  other: 'medical',
};

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

/** Text if it's filled in, or a [bracketed reminder] if not. */
function orBlank(value: string | undefined, blank: string): string {
  return value && value.trim() ? value.trim() : `[${blank}]`;
}

function mobilitySentence(needs: MobilityNeeds | undefined, isRider: boolean, name: string): string {
  const who = isRider ? 'I' : name;
  switch (needs) {
    case 'none':
      return `${who} ${isRider ? "don't" : "doesn't"} need any special help with the vehicle.`;
    case 'walker':
      return `${who} ${isRider ? 'use' : 'uses'} a walker.`;
    case 'wheelchair':
      return `${who} ${isRider ? 'use' : 'uses'} a wheelchair and ${isRider ? 'need' : 'needs'} a wheelchair-accessible vehicle.`;
    case 'needs_help':
      return `${who} ${isRider ? 'need' : 'needs'} help getting to and into the vehicle.`;
    default:
      return '[Any mobility needs, like a walker or wheelchair]';
  }
}

/** The script, one sentence per line, ready to read out or copy. */
export function buildCallScript(input: CallScriptInput): string {
  const { profile, appointment, tripDate } = input;
  const isRider = profile.role === 'rider';
  const rider = profile.riderFirstName;
  const caller = isRider ? rider : orBlank(profile.caregiverName, 'your name');
  const me = isRider ? 'me' : rider;
  const lines = [
    isRider
      ? `Hi, my name is ${caller}. I'm calling to book a Medicaid ride.`
      : `Hi, my name is ${caller}. I'm calling to book a Medicaid ride for ${rider}.`,
    `${isRider ? 'My' : `${rider}'s`} Medicaid ID number is [Medicaid ID number].`,
    `The ${APPOINTMENT_WORDS[appointment.type]} appointment is on ${formatLongDate(tripDate, true)} at ${formatTime(appointment.time)}.`,
    `It's at ${appointment.clinicName}, ${orBlank(appointment.clinicAddress, 'clinic address')}.`,
    `Please pick ${me} up at ${orBlank(profile.homeAddress, 'home address')} at ${
      input.pickupTime ? formatTime(input.pickupTime) : '[pickup time]'
    }.`,
    input.noReturnRide
      ? `${isRider ? 'I' : rider} won't need a ride home.`
      : `${isRider ? 'I' : rider} will also need a ride home at ${input.returnTime ? formatTime(input.returnTime) : "[time you'll be ready]"}.`,
    mobilitySentence(profile.mobilityNeeds, isRider, rider),
  ];
  if (input.notes.trim()) lines.push(`Also: ${input.notes.trim()}`);
  lines.push('Can you read back the pickup time and give me a confirmation number?');
  return lines.join('\n');
}
