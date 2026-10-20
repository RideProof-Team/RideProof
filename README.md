# RideProof

RideProof is a rider-owned record and advocacy tool for people who rely on Medicaid non-emergency medical transportation (NEMT).

It helps a rider or caregiver:

- remember when to book transportation;
- save appointment, pickup, and confirmation details;
- record whether a ride was on time, late, or never arrived;
- see patterns across recurring medical trips; and
- create an editable evidence report and complaint letter.

## The problem

When a medical ride fails, a patient may report one incident by phone but still lack an organized record showing repeated failures. For patients attending dialysis or other recurring care, late and missed rides can interfere with treatment.

RideProof gives the rider a record of their own.

## Core demo story

Rosa attends dialysis every Monday, Wednesday, and Friday. Her granddaughter Maria uses RideProof to save each booking confirmation and check whether the driver arrives. After several late pickups and no-shows, RideProof creates a dated timeline and an editable report Maria can send to the appropriate transportation broker or health plan.

## MVP

1. **Today** - next appointment, scheduled pickup, confirmation number, and broker contact.
2. **Add a ride** - appointment and transportation details, including recurring visits.
3. **Ride check-in** - on time, late, or did not arrive, with automatic timestamps.
4. **History** - a rider-controlled record of completed and failed trips.
5. **Create report** - summary statistics, detailed timeline, and editable complaint text.

The Congressional App Challenge prototype will use fictional data and focus on Washington Apple Health transportation rules. It will not claim affiliation with Medicaid, Apple Health, a health plan, or a transportation provider.

## Product principles

- Accessible: large controls, high contrast, plain language, and screen-reader support.
- Private by default: minimal information and on-device storage for the prototype.
- Honest: rider entries are documented evidence, not independently verified proof.
- Actionable: make the correct contact information and ride history easy to find.
- Focused: help riders document and act on failures; do not pretend to dispatch drivers.

## Proposed stack

- React + TypeScript
- Vite
- Progressive Web App
- Local browser storage
- PDF report generation

## Team workflow

- Create a branch for each feature: `feature/ride-check-in`, `feature/reports`, and so on.
- Open a pull request into `main` when a feature is ready.
- Do not commit real patient information, Medicaid identifiers, secrets, or API keys.
- Use fictional names and appointments in screenshots and demonstrations.

## Status

Project setup and prototype development for the 2026 Congressional App Challenge.
