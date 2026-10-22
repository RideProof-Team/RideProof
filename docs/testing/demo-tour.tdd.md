# Demo tour verification

Journeys derived from the request: entering demo starts a walkthrough; users can pause, navigate, finish, restart, or explore without changing their real ride records.

## Evidence

- RED: `node node_modules/vitest/vitest.mjs run src/components/DemoTour.test.tsx --maxWorkers=1` failed to resolve the not-yet-implemented DemoTour component. Checkpoint: `baae8b1`.
- GREEN: the same component target plus `src/App.entry.test.tsx` passed 7 tests after implementation. Checkpoint: `92132e9`.
- Final: `node node_modules/vitest/vitest.mjs run --maxWorkers=1` passed 108 tests across 13 files. TypeScript checking (`node node_modules/typescript/bin/tsc`), Vite production build, and `git diff --check` also passed.

## Guarantees exercised

- Component tests: automatic advance after 15 seconds; pause/resume; Back/Next with playback paused; pause when interacting outside the tour; final-step completion; close and return from a non-tour route.
- App integration test: landing-page demo entry opens the guide with the sample profile; restart resumes playback; closing the guide leaves demo active; entering sign-in removes the guide and returns to real device access.
- Autoplay only navigates. It does not fill forms, save ride answers, send complaints, dial numbers, or reset sample records. Existing separate demo storage remains in use.

## Known gaps

- Coverage command `node node_modules/vitest/vitest.mjs run src/components/DemoTour.test.tsx --coverage --maxWorkers=1` could not run because `@vitest/coverage-v8` is absent. No coverage percentage is claimed.
- Browser access was blocked by the environment's policy, so rendered layouts and browser end-to-end interaction were not verified. Tests run in jsdom.
- Tab-visibility and scroll pauses are implemented but not directly exercised by the component tests.
- Existing landing-page and styling changes remain in the working tree. Checkpoint commits isolate the new tour component/tests; app integration remains local with those earlier edits. Nothing was pushed.
