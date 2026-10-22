# State selection and motion — TDD evidence

## Source and user journeys

No plan file was provided. The journeys were derived from the request:

- As a rider or caregiver anywhere in the United States, I can choose my state and use the core ride-record features even when detailed state guidance is not available yet.
- As a visitor, I get clear, brief visual feedback that helps me follow the page without distracting from medical-ride information.
- As a person who requests reduced motion, I do not receive the new entrance or interaction animations.

## RED and GREEN evidence

- State RED: `npm test -- --run src/lib/validateProfile.test.ts --reporter=verbose` ran 7 tests with 2 intended failures: Alaska was rejected and the selector returned 3 options instead of 51.
- State GREEN: the same focused command passed all 7 tests after state choices were separated from detailed state rules.
- Motion RED: `npm test -- --run src/styles.motion.test.ts --reporter=verbose` ran 3 tests with 3 intended failures because the screen, trip-log, and reduced-motion rules did not exist.
- Motion GREEN: the same focused command passed all 3 tests after the accessible motion system was added.

## Test specification

| # | What is guaranteed | Test or command | Type | Result |
|---|---|---|---|---|
| 1 | All 50 states and Washington, DC appear alphabetically | `src/lib/validateProfile.test.ts` | Unit | PASS |
| 2 | A valid state without detailed rules, such as Alaska, is accepted | `src/lib/validateProfile.test.ts` | Unit | PASS |
| 3 | Invalid state codes are still rejected | `src/lib/validateProfile.test.ts` | Unit | PASS |
| 4 | Existing California, Texas, and Washington rule records remain available | `src/lib/validateProfile.test.ts` | Unit | PASS |
| 5 | App screens/cards and the landing trip log have coordinated motion | `src/styles.motion.test.ts` | Static CSS contract | PASS |
| 6 | New motion includes an explicit reduced-motion path | `src/styles.motion.test.ts` | Accessibility contract | PASS |

## Coverage and known gaps

The project does not configure a coverage command, so a percentage was not measured. The state behavior is covered at the validation/data boundary and the motion accessibility contract is covered statically; visual timing remains a browser-level design judgment.
