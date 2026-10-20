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

export function listStates(): StateRule[] {
  return allRules;
}

/** Look up one state's rules. Returns undefined if we don't have that state. */
export function getStateRule(code: string): StateRule | undefined {
  return allRules.find((rule) => rule.code === code);
}
