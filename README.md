# RideProof

RideProof helps Medicaid members who use free **non-emergency medical transportation (NEMT)** keep track of their rides, catch problems, and prove when rides fail.

Riders (often seniors, people with disabilities, or dialysis patients) or their caregivers use it to:

1. **Get reminders** to book rides before their state's booking deadline.
2. **Log each ride with one tap per question:** on time, late, or never came.
3. **Generate a report and a ready-to-send complaint letter** that shows the pattern of problems.

> RideProof is not affiliated with any state, health plan, or ride company. Confirm rules with your state Medicaid office.

---

## The problem

When a medical ride fails, a patient may report it by phone, but they rarely have an organized record showing that failures keep happening. For someone who needs dialysis three times a week, a ride that doesn't come means a missed life-sustaining treatment. RideProof gives the rider a dated record of their own, and turns it into evidence they can send.

## Features

| Screen | What it does |
|---|---|
| **Welcome / setup** | Choose rider or caregiver, enter first name, state, ride company and phone. |
| **Home** | Today's appointment with a big **Check in on today's ride** button, booking reminders, the next appointment and whether its ride is booked, and what's coming up. |
| **Schedule** | Add, edit, and delete appointments, including repeating ones (e.g. every Mon/Wed/Fri). |
| **Ride check-in** | One question per screen with big buttons: pickup → how late → appointment outcome → ride home → optional notes. Timestamped automatically. |
| **History** | Every logged ride, color-coded **and** labeled with icons and words (green = on time, yellow = late, red = problem). Lists recent trips that still need a check-in. |
| **Report** | Totals for a time period, a headline sentence, a week-by-week chart, **Download PDF report**, and **Create complaint letter**. |
| **Complaint letter** | A formal letter written from the logs, editable before sending, with Copy, Email, Download PDF, and Print. Shows who to send it to based on the state rules file. |
| **Help** | What to do when a ride (or ride home) doesn't come, the state's rules, and how to install the app. |
| **Settings** | Edit your information, notification status, **Delete all my data**, and privacy info. |

It's also a **Progressive Web App**: it can be installed on a phone's home screen and works with no internet connection.

---

## How to run it

You need [Node.js](https://nodejs.org/) version 20 or newer.

```bash
npm install        # download the libraries (first time only)
npm run dev        # start the app at http://localhost:5173
npm test           # run the 80 automated tests
npm run build      # build the final app into the dist/ folder
npm run preview    # try the built app (including offline mode) at http://localhost:4173
```

**To see it at phone size:** open the app in Chrome, press F12, click the phone icon, and pick a phone about 390px wide (e.g. "iPhone 12 Pro").

**To test offline mode:** run `npm run build` then `npm run preview`, open the app once, then in DevTools → Network choose "Offline" and reload. (Offline mode is turned off during `npm run dev` on purpose, so you always see your latest code.)

**To put it online:** the `dist/` folder is a plain static website with relative paths, so it can be uploaded to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.). Use an `https://` address; phones only install apps and allow notifications on secure sites.

---

## Demo mode (for the pitch video)

Tap **Demo** in the top-right corner of any screen, including the Welcome screen. No setup needed.

- A purple banner appears: **"Demo mode — sample data."** The button changes to **Exit demo**.
- The app pretends today is **Friday, October 30, 2026** (`DEMO_TODAY` in `src/lib/clock.ts`), so dates and reminders look the same every time you record.
- **Demo data is stored in a completely separate database**, so turning demo mode on or off never changes your own data.

**The demo story (all fake):** Rosa, 72, goes to dialysis every Mon/Wed/Fri at 9:00 AM at "Riverside Dialysis Center." Her granddaughter Maria uses RideProof in caregiver mode. The ride company is "Sample Ride Co." (555-0100). Over the past month, 13 rides were logged: 5 late pickups (15, 30, and 60+ minutes), 2 rides that never came, a missed dialysis session on October 14, and a ride home that never came ("Waited 2 hours for ride home"). Today there's a dialysis ride to check in on, and a cardiology appointment on Tuesday whose ride isn't booked, so a **"Book today"** reminder shows on Home.

**Demo controls:** tap the purple banner to open:
- shortcuts to **Home, Ride check-in, History, Report, Complaint preview**;
- **Simulate reminder**: shows the booking reminder as a notification-style pop-up inside the app (so it appears in screen recordings), and as a real phone notification if allowed;
- **Reset demo**: puts the story back to the start, so you can do another take.

**Suggested video flow (about 2 minutes):**
1. Home: point out today's dialysis ride and the "Book a ride, due today" reminder.
2. Tap **Check in on today's ride** and answer: Late → An hour or more → Yes, but late → On time → Save.
3. **History**: the color-coded month of rides.
4. **Report**: "7 of 13 rides had a problem: 5 were late, and 2 never came" (8 of 14 after your live check-in), plus the weekly chart showing the bad weeks.
5. **Create complaint letter**: the letter is already written ("…causing me to miss my dialysis appointment on October 14, 2026."). Show Copy / Email / PDF.
6. Open demo controls → **Reset demo** before the next take.

---

## State rules: you need to fill these in

`src/data/stateRules.json` has three example states (Washington, California, Texas). **Every value is a placeholder.** Look up the real rules on each state's Medicaid website, then:

1. Set `bookingWindowBusinessDays` (how many business days ahead rides must be booked).
2. Replace each `complaintContacts` entry's `name`, `phone`, `email`, and `website`.
3. Change `"isPlaceholder": true` to `false` once a state is verified. That removes the "these are placeholders" warnings in the app.
4. Run `npm test`. One test expects all three states to be placeholders and will tell you it needs updating. The demo tests also check that Washington's rule still produces a booking reminder.

To add a state, copy one entry and change the two-letter key (e.g. `"OR"`).

---

## How it's built

**Tech stack:** React + TypeScript + Vite · IndexedDB (via `idb`) for storage · Chart.js (`react-chartjs-2`) for the chart · jsPDF for PDFs · a hand-written service worker for offline use · Vitest for tests.

**No backend.** There are no accounts and no server. All data stays on the device.

```
src/
  types.ts              The data model: Profile, Appointment, RideLog
  App.tsx               Picks real or demo storage, loads the profile, shows the right screen
  AppContext.tsx        Shared values every screen can read (mode, storage, today...)
  data/stateRules.json  Booking windows and complaint contacts per state (PLACEHOLDERS)
  screens/              One file per screen (Home, CheckIn, Report, Complaint, ...)
  components/           Reusable pieces (Header, Icon, RideChart, DemoControls, ...)
  lib/                  The logic, with no screen code, so it can be unit tested:
    storage.ts            IndexedDB: two separate databases, real and demo
    dates.ts              Date math on "YYYY-MM-DD" text (no time-zone bugs)
    recurrence.ts         Turns "every Mon/Wed/Fri" into actual trip dates
    businessDays.ts       Federal holidays + booking deadline in business days
    reminders.ts          Which unbooked rides need booking soon, and the wording
    notifications.ts      Optional browser notifications (works without them)
    checkinFlow.ts        Which check-in question comes next
    reportStats.ts        All the counting for the report, PDF, and letter
    complaintLetter.ts    Writes the letter in natural English
    pdfWriter.ts / pdfReport.ts   Builds the PDF files
    demoData.ts           The fake Rosa story, demo seeding and reset
    clock.ts              "What's today?" (fixed date in demo mode)
    router.ts             Which screen to show, based on the #address
  sw-template.js        The service worker (offline support)
vite.config.ts          Build settings + a small plugin that writes the offline file list
```

**Tests** (`npm test`, 80 tests in 9 files) cover the tricky logic: business-day deadlines and holidays, recurring appointment dates, report statistics, the complaint letter's wording, the check-in question order, and that demo data never mixes with real data.

## Accessibility

Many RideProof users are elderly or disabled, so accessibility was a requirement from the start, not an add-on:

- Body text is 18px or larger and **grows with the user's text-size setting**. At very large sizes, the layout switches to a single column with no sideways scrolling.
- Every button and link is at least 48px tall. Check-in answers are 80px tall.
- Status is never shown by color alone: there's always an icon **and** a word (✓ On time, 🕑 Late, ✕ Never came).
- Proper labels, headings, and landmarks for screen readers. Focus moves to each new screen's heading and each new check-in question.
- High contrast colors (WCAG AA or better). An automated **axe-core** audit of every screen found **0 issues**.
- The chart has a legend, a text summary for screen readers, and a "Show as a table" option.
- Animations turn off for people who set "reduce motion" on their phone.
- Plain language and as few steps as possible: one tap per check-in question, plus one-tap "I booked this ride" and "Call the ride company."

## Privacy

- Everything is stored only on the device, in the browser's IndexedDB. Nothing is sent anywhere.
- **Settings → Delete all my data** erases everything RideProof saved.
- The complaint letter leaves a `[bracketed]` space for the Medicaid ID instead of storing it.
- All demo data is fictional, and no real patient data appears anywhere in the code.

## Limitations and future ideas

- **Notifications only arrive while the app is open** (or opened). Without a server, a web app can't wake itself up to send a reminder. The Home screen reminders always work.
- On iPhone, notifications only work after the app is added to the Home Screen.
- Rider entries are the rider's own record, not independent proof. A dated record made at the time is still strong evidence.
- Ideas: export/import a backup file, Spanish and other languages, verified rules for all 50 states.

---

## Technical challenges

These are the hardest problems we solved, written so they can be adapted for the Congressional App Challenge submission.

### 1. Keeping demo data completely separate from real data
**Problem:** The pitch video needs a rich sample story, but a real user who taps "Demo" must never have their own records changed, deleted, or mixed with fake ones.
**Solution:** Real data and demo data live in **two separate IndexedDB databases** (`rideproof-real` and `rideproof-demo`). The rest of the app never talks to a database directly. It asks for a "storage" object for one mode, and that object can only open its own database. The demo seeding and "Reset demo" functions also refuse to run on real storage. Automated tests prove that seeding, editing, and resetting the demo leave real data exactly as it was.

### 2. Dates without time-zone bugs
**Problem:** JavaScript `Date` objects are exact moments in time, so "October 14 at midnight" can turn into October 13 in another time zone. For a medical appointment, that's a wrong day.
**Solution:** Calendar days are stored as plain text (`"2026-10-14"`). Date math happens on local dates and is turned straight back into text. We ran the test suite in several U.S. time zones (e.g. `TZ=Pacific/Honolulu npm test` on Mac/Linux), and the tests cross a daylight-saving change, to prove dates never shift.

### 3. Recurring appointments
**Problem:** Dialysis happens three times a week, forever. Saving a copy for every week would mean hundreds of records, and changing the time would mean editing all of them.
**Solution:** A repeating appointment is saved **once, as a rule** ("every Mon/Wed/Fri starting Sept 30"). When a screen needs dates, the app works out the actual trips for just the days it needs. Each ride log stores its trip date, so one appointment can have many check-ins.

### 4. Booking deadlines in business days
**Problem:** States require rides to be booked a number of *business* days ahead. A Monday appointment with a 2-day rule must be booked by the previous Thursday, and holidays don't count either.
**Solution:** The app counts backward one day at a time, skipping weekends and the 11 federal holidays. Holidays are *calculated* for any year (e.g. "4th Thursday of November"), including the rule that a holiday on Saturday is observed on Friday. That catches tricky cases like New Year's Day 2028 being observed on December 31, 2027. Repeating appointments only produce one reminder (for the next trip), so the screen doesn't fill up.

### 5. Writing a complaint letter that reads naturally
**Problem:** The letter has to sound like a person wrote it, for *any* data: "1 time" vs. "5 times", one missed date vs. several, dates in different years, and parts that only apply sometimes.
**Solution:** The letter is built from small, tested sentence helpers: joining lists ("A, B, and C"), saying the year once ("October 14 and October 21, 2026"), date ranges, and choosing words like "my dialysis appointment" vs. "my medical appointments." Tests check the exact output, including the sentence used in the demo video. Testing caught a real bug, where a date appeared twice in one sentence.

### 6. One set of numbers everywhere
**Problem:** The Report screen, the PDF, and the letter must never disagree about how many rides were late.
**Solution:** All three use the same `computeStats` function. The PDF generator wraps text, adds page breaks, repeats the table header on new pages, keeps the chart's shape, and swaps characters the PDF fonts can't print. The PDF code is only downloaded when someone taps the button, so the app opens faster.

### 7. Working offline
**Problem:** Riders may be in a clinic basement or out of data. The app must open with no connection.
**Solution:** A service worker saves every app file on the first visit and serves them from that saved copy afterward. The build tool gives files new random names on every build, so we wrote a small **Vite plugin** that writes the exact file list and a version number into the service worker at build time. Phones automatically get updates when the version changes.

### 8. Accessibility for elderly and disabled users
**Problem:** Users may have low vision, shaky hands, or use a screen reader.
**Solution:** Big buttons, one question per screen, icons plus words instead of color alone, and focus moved to each new screen and question for screen readers. Testing at **double text size** showed the original design failed: the pinned header covered a third of the screen and the menu labels overlapped. A media query measured in `em` (which tracks the user's text-size setting) now switches to a one-column layout with an unpinned header. The same test found a hidden "skip" link poking out and covering the Demo button at large sizes, which is now fixed. Every screen passes an automated axe-core accessibility audit with zero issues.

### 9. Reminders without a server
**Problem:** Normal apps get push notifications from a server, and RideProof has none, for privacy.
**Solution:** Reminders are calculated on the device and always shown on the Home screen. If the user allows it, the same reminders are also sent as browser notifications, at most once per reminder per day. The app works fully if notifications are blocked or unsupported. Demo mode adds a "Simulate reminder" button with an in-app pop-up, so the reminder shows up in screen recordings.

---

## Team workflow

- Create a branch for each feature, and open a pull request into `main` when it's ready.
- Never commit real patient names, health information, Medicaid ID numbers, confirmation numbers, secrets, or API keys. Use fictional data in screenshots and demos. See `CONTRIBUTING.md`.

Built for the 2026 Congressional App Challenge.
