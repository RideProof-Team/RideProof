// ---------------------------------------------------------------------------
// validateProfile.ts — checks the setup form before saving.
// Kept separate from the screen so it's easy to unit test.
// Returns a list of problems in plain language; an empty object means "OK".
// ---------------------------------------------------------------------------
import type { Profile } from '../types';
import { getStateRule } from './stateRules';

export type ProfileErrors = Partial<Record<keyof Profile, string>>;

export function validateProfile(profile: Profile): ProfileErrors {
  const errors: ProfileErrors = {};

  if (profile.riderFirstName.trim() === '') {
    errors.riderFirstName = 'Please enter a first name.';
  }
  if (!getStateRule(profile.state)) {
    errors.state = 'Please choose a state.';
  }
  if (profile.rideCompanyName.trim() === '') {
    errors.rideCompanyName = 'Please enter the ride company name.';
  }
  // Count only the digits, so "(555) 010-0000" and "555-0100" both work.
  const digits = profile.rideCompanyPhone.replace(/\D/g, '');
  if (digits.length < 7) {
    errors.rideCompanyPhone = 'Please enter the full phone number.';
  }

  return errors;
}
