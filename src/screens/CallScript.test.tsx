// The booking call screen: the ride is only marked booked when the rider says so.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../App';
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
  history.replaceState(null, '', '#/call/a1/2099-11-05');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function settle(check: () => void) {
  await vi.waitFor(async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    check();
  });
}
const radio = (label: string) =>
  Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes(label))!.querySelector('input')!;
const button = (label: string) => Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(label))!;

it('shows the script, and "I couldn\'t book it" saves evidence without marking the ride booked', async () => {
  await act(async () => root.render(<App />));
  await settle(() => expect(container.querySelector('.call-script')?.textContent).toContain('Please pick me up at [home address] at 8:00 AM.'));
  expect(container.querySelector('.call-script')?.textContent).toContain('I use a walker.');

  await act(async () => radio('I couldn’t book it').click());
  await act(async () => button('Save what happened').click());
  expect(container.textContent).toContain('Choose what happened.'); // a reason is required

  await act(async () => radio('No rides available').click());
  await act(async () => button('Save what happened').click());
  await settle(async () => expect(await real.listBookingAttempts()).toHaveLength(1));
  const [attempt] = await real.listBookingAttempts();
  expect(attempt).toMatchObject({ appointmentId: 'a1', tripDate: '2099-11-05', reason: 'no_rides' });
  expect((await real.listAppointments())[0].rideBooked).toBe(false);
});

it('"Yes, it’s booked" marks it booked with the confirmation number', async () => {
  await act(async () => root.render(<App />));
  await settle(() => expect(container.querySelector('.call-script')).toBeTruthy());
  await act(async () => radio('Yes, it’s booked').click());
  const input = container.querySelector<HTMLInputElement>('#script-confirmation')!;
  await act(async () => {
    // React listens for the browser's own "input" event, so set the value the way a person typing would.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'R-77');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => button('Mark the ride as booked').click());
  await settle(async () => expect((await real.listAppointments())[0]).toMatchObject({ rideBooked: true, confirmationNumber: 'R-77' }));
  expect(await real.listBookingAttempts()).toEqual([]);
});
