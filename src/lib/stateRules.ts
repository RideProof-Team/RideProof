// ---------------------------------------------------------------------------
// stateRules.ts — gives the rest of the app a typed, easy way to read
// stateRules.json. Screens call these functions instead of reading the JSON
// directly, so if the file format ever changes, only this file changes.
// ---------------------------------------------------------------------------
import rawRules from '../data/stateRules.json';

export interface ComplaintContact {
  name: string;
  phone: string;
  email: string;
  website: string;
}

export interface StateRule {
  code: string;
  name: string;
  /** True while the values are unverified placeholders. */
  isPlaceholder: boolean;
  /** How many business days ahead a ride must be booked. */
  bookingWindowBusinessDays: number;
  complaintContacts: ComplaintContact[];
}

export interface StateOption {
  code: string;
  name: string;
}

// State selection is intentionally separate from the smaller set of detailed
// Medicaid rules. A rider can use RideConnect anywhere in the United States;
// screens that need state-specific rules already handle an unavailable rule.
const stateNames: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'Washington, DC', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana',
  IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming',
};

const allStates: StateOption[] = Object.entries(stateNames)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Turn the JSON object { WA: {...}, CA: {...} } into a list of StateRule,
// sorted alphabetically by state name for the dropdown on the setup screen.
const allRules: StateRule[] = Object.entries(rawRules.states)
  .map(([code, rule]) => ({
    code,
    name: rule.name,
    isPlaceholder: rule.isPlaceholder,
    bookingWindowBusinessDays: rule.bookingWindowBusinessDays,
    complaintContacts: rule.complaintContacts,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function listStates(): StateOption[] {
  return allStates;
}

export function isStateCode(code: string): boolean {
  return Object.hasOwn(stateNames, code);
}

/** Look up one state's rules. Returns undefined if we don't have that state. */
export function getStateRule(code: string): StateRule | undefined {
  return allRules.find((rule) => rule.code === code);
}

/** A state's full name ("Alaska"), for any of the 50 states and DC. */
export function stateName(code: string): string {
  return stateNames[code] ?? code;
}
