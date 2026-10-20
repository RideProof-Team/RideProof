import { describe, expect, it } from 'vitest';
import { validateProfile } from './validateProfile';
import { listStates } from './stateRules';
import type { Profile } from '../types';

const good: Profile = {
  role: 'caregiver',
  riderFirstName: 'Rosa',
  caregiverName: '',
  state: 'WA',
  rideCompanyName: 'Sample Ride Co.',
  rideCompanyPhone: '555-0100',
  healthPlanName: '',
};

describe('validateProfile', () => {
  it('accepts a complete profile (health plan is optional)', () => {
    expect(validateProfile(good)).toEqual({});
  });

  it('reports every missing required field', () => {
    const errors = validateProfile({
      ...good,
      riderFirstName: '   ',
      state: '',
      rideCompanyName: '',
      rideCompanyPhone: '',
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['rideCompanyName', 'rideCompanyPhone', 'riderFirstName', 'state'],
    );
  });

  it('rejects a state we have no rules for', () => {
    expect(validateProfile({ ...good, state: 'ZZ' }).state).toBeDefined();
  });

  it('rejects a phone number that is too short', () => {
    expect(validateProfile({ ...good, rideCompanyPhone: '555' }).rideCompanyPhone).toBeDefined();
  });
});

describe('state rules file', () => {
  it('has 3 example states, all marked as placeholders', () => {
    const states = listStates();
    expect(states).toHaveLength(3);
    for (const state of states) {
      expect(state.isPlaceholder).toBe(true);
      expect(state.bookingWindowBusinessDays).toBeGreaterThan(0);
    }
  });
});
