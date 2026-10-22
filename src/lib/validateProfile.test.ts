import { describe, expect, it } from 'vitest';
import { validateProfile } from './validateProfile';
import { getStateRule, listStates } from './stateRules';
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

  it('accepts a valid state even when detailed Medicaid rules are not available yet', () => {
    expect(validateProfile({ ...good, state: 'AK' }).state).toBeUndefined();
  });

  it('rejects a phone number that is too short', () => {
    expect(validateProfile({ ...good, rideCompanyPhone: '555' }).rideCompanyPhone).toBeDefined();
  });
});

describe('state rules file', () => {
  it('offers all 50 states and Washington, DC in alphabetical order', () => {
    const states = listStates();
    expect(states).toHaveLength(51);
    expect(states[0]).toEqual({ code: 'AL', name: 'Alabama' });
    expect(states.at(-1)).toEqual({ code: 'WY', name: 'Wyoming' });
    expect(states).toContainEqual({ code: 'DC', name: 'Washington, DC' });
  });

  it('keeps the existing detailed example rules available', () => {
    for (const code of ['CA', 'TX', 'WA']) {
      const rule = getStateRule(code);
      expect(rule?.isPlaceholder).toBe(true);
      expect(rule?.bookingWindowBusinessDays).toBeGreaterThan(0);
    }
  });
});
