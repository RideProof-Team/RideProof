# RideConnect rebrand — TDD evidence

## Source and user journey

No plan file was provided. The journey was derived from the rebrand request: as a rider or caregiver, I see the RideConnect name consistently across the app and its exported materials, while records and backups created before the rename continue to work.

## RED and GREEN evidence

- RED: `npm test -- --run src/screens/PublicPages.test.tsx --reporter=verbose` ran the new brand-mark assertion and failed with `Expected: "rc"` / `Received: "rp"`.
- GREEN: the same command passed all 4 public-entry-page tests after the mark was updated.
- Regression: `npm test -- --run` passed all 114 tests in 14 files.
- Build: `npm run build` completed TypeScript checking and the production Vite build successfully.
- Formatting: `git diff --check` reported no whitespace errors.

## Test specification

| # | What is guaranteed | Test or command | Type | Result |
|---|---|---|---|---|
| 1 | The landing page displays RideConnect, contains no visible RideProof name, uses the `rc` mark, and sets the RideConnect page title | `src/screens/PublicPages.test.tsx` | Component | PASS |
| 2 | Existing backup behavior remains valid after user-facing backup copy and filenames are renamed | `src/lib/backup.test.ts` via full suite | Unit | PASS |
| 3 | Existing application behaviors were not broken by the rename | `npm test -- --run` | Regression | PASS |
| 4 | TypeScript and the production bundle compile with the renamed package, manifest, and service worker | `npm run build` | Build | PASS |

## Compatibility and known gaps

The IndexedDB names, local-storage keys, and backup format identifier intentionally retain their legacy lowercase values. Renaming those identifiers would disconnect existing on-device records or prevent older backup files from importing. The project has no configured coverage script, so an 80% coverage percentage was not measured in this run. Browser-level E2E coverage was not added for this copy-and-metadata-only change.
