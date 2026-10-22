// Documents in another language: with the app in Spanish, the call script
// starts in Spanish, and "Language of this document" can switch just the
// script to English (some ride company agents only speak English).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../App';
import { applyLanguage } from '../lib/i18n';
import { createStorage } from '../lib/storage';
import type { Appointment, Profile } from '../types';

const real = createStorage('real');
const profile: Profile = {
  role: 'rider', riderFirstName: 'Sam', caregiverName: '', state: 'WA',
  rideCompanyName: 'Sample Ride Co.', rideCompanyPhone: '555-0100', healthPlanName: '', mobilityNeeds: 'walker',
};
const appointment: Appointment = {
  id: 'a1', date: '2099-11-05', time: '09:00', clinicName: 'Sample Clinic', clinicAddress: '1 Example Road', type: 'checkup',
  recurrence: { kind: 'none' }, rideBooked: false, confirmationNumber: '',
};

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  localStorage.clear();
  await real.clearAll();
  await real.saveProfile(profile);
  await real.saveAppointment(appointment);
  applyLanguage('es');
  history.replaceState(null, '', '#/call/a1/2099-11-05');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  applyLanguage('en');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function settle(check: () => void) {
  await vi.waitFor(async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    check();
  });
}

it('writes the call script in Spanish, and can switch just the script to English', async () => {
  await act(async () => root.render(<App />));
  await settle(() => expect(container.querySelector('.call-script')).toBeTruthy());

  // The screen and the script both start in Spanish.
  const script = () => container.querySelector<HTMLElement>('.call-script')!;
  expect(container.querySelector('h1')?.textContent).toBe('Llamar para reservar un viaje');
  expect(container.querySelector('#script-heading')?.textContent).toBe('Qué decir');
  expect(container.textContent).toContain('Copiar el guion');
  expect(script().lang).toBe('es');
  // (Dates come from lib/dates.ts, so they follow the script's language.)
  expect(script().textContent).toContain('jueves, 5 de noviembre de 2099');

  const select = container.querySelector<HTMLSelectElement>('#script-language')!;
  expect(select.value).toBe('es');
  await act(async () => {
    select.value = 'en';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Now the script is in English, but the rest of the screen stays Spanish.
  expect(script().lang).toBe('en');
  expect(script().textContent).toContain('Please pick me up at [home address] at 8:00 AM.');
  expect(script().textContent).toContain('I use a walker.');
  expect(script().textContent).toContain('Thursday, November 5, 2099');
  expect(script().textContent).not.toContain('jueves');
  expect(container.querySelector('h1')?.textContent).toBe('Llamar para reservar un viaje');
  expect(container.querySelector('#after-call-heading')?.textContent).toBe('Después de la llamada');
  expect(container.textContent).toContain('No pude reservarlo');
});
