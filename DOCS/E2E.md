# End-to-end testing

## E2E-first

For every feature, work happens in this order:

0. **Document the scenarios.** Write every e2e scenario and the unit cases the slice needs in
   [test-plan/](test-plan/README.md), with status `planned`. `npm run check:test-plan` keeps the
   documents and the suites in step from then on.
1. **Write the specs.**
   - Write Playwright specs in `e2e/web/specs/**` and Maestro flows in `e2e/native/flows/**`.
   - Start each Playwright test with `spec('<scenario id>')`, and give each Maestro flow a
     `# scenario: <scenario id>` header. Flip the scenario's status to `red`.
   - Add the ids to `e2e/shared/expected-red.json`, and tag the flows `pending`.
   - Open the PR with the `e2e-spec-first` label. It must change nothing under `src/`.
2. **Write the contracts and mapper tests.**
3. **Write the screens** until the specs pass.
4. **Remove the ids** from `expected-red.json`, and the `pending` tags, in the same PR.

How red specs coexist with a green CI:

- **Playwright `mocked` and `mobile`:** an expected-red spec runs as `test.fail()`. If it starts
  passing, Playwright reports "Expected to fail, but passed", and the run fails until its id is
  removed from the list. Phase 0 went through exactly this cycle.
- **Playwright `backend` and `two-factor`:** an expected-red spec is `test.fixme()` on PRs. The
  nightly probe (`PENDING_PROBE=1`) runs them as `test.fail()`, and posts why each one still
  fails as a "Still red" annotation (`e2e/web/red-reporter.ts`).
- **Maestro:** `pending` flows are excluded on PRs (`--exclude-tags=pending`).
- **`scripts/check-expected-red.mjs`** checks four things:
  - ids match parity rows and specs;
  - `pending` tags match the list;
  - every row of the current phase (`e2e/shared/phase.json`) has a web spec;
  - the list only shrinks against `origin/main`, except in `e2e-spec-first` PRs.

## Parity matrix

`e2e/shared/parity-matrix.json` has one row per behaviour, each with an id, phase, area, source and
platforms. It was generated from the fineract-backoffice-ui e2e specs (Apache-2.0) and the Mifos
web-app Playwright tests.

The web-app is **MPL-2.0**, so its tests are a **behavioural reference only**. Read them for
_what_ to test; do not copy code, page objects, factories or translations from it. When a phase
starts, add rows for its features that no reference spec covers.

## Selectors

`testID` is the only selector. Declare every id in `e2e/shared/testids.ts`; the app and the web
specs both import it, and Maestro uses `id:`. `scripts/check-testids.mjs` fails on any of these:

- a hard-coded testID in the app;
- an undeclared Maestro id;
- a declared id that no screen uses.

## Running

```bash
npm run web:export
npm run e2e:web:mocked                                  # mocked + mobile projects
npm run e2e:stack -- --fresh                            # docker backend, about 1.5 GB
npm run e2e:web -- --project=setup --project=backend    # then stop it: npm run e2e:stack -- --down
APP_ID=io.github.amanmittal.mfibackoffice npm run e2e:native   # Maestro, device or emulator
```

**Native flows against the stack** (tagged `backend`) need an app that can reach it. The
emulator's `localhost` is tunnelled to the host with `adb reverse tcp:8080 tcp:8080`, and a local
relay turns that plain HTTP into HTTPS for the stack, whose certificate is self-signed:
`socat TCP-LISTEN:8080,fork,reuseaddr OPENSSL:localhost:8443,verify=0`. Build the app with
`EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/fineract-provider/api` and `MBO_E2E_CLEARTEXT=1`
(`plugins/with-e2e-cleartext.js` lets that one build use plain HTTP), and pass
`-e API_URL=http://localhost:8080/fineract-provider/api` so the flows' seed scripts use the relay
too. `scripts/maestro-ci.sh` does all of this on CI. iOS runs only the flows that need no stack.

## Resource limits

The development machine and CI runners are shared. Rules:

- **Never run the heavy suites side by side on one machine:** Playwright `backend`, Maestro on an
  emulator, and the docker stack. CI gives each one its own job; the one exception is the Android
  job, whose flows need the stack: it builds first, then starts the stack, then the emulator, on a
  runner with 16 GB. Locally that needs about 5 GB free.
- **The stack checks memory first:** `e2e-stack.sh` refuses to start with less than 2 GB available
  (`MBO_MIN_FREE_MB`). Its containers are capped at 512 MB (PostgreSQL) and 1.5 GB (backend).
- **Playwright is capped:** at most 2 workers locally, 1 on CI and against the backend.

### Per-platform entries

An entry in `expected-red.json` is either `ID`, red on every platform, or `ID@web` / `ID@native`,
red on that platform only. A behaviour is often green in the browser before a device has run its
Maestro flow, so the native side stays explicitly red, and its flow keeps the `pending` tag, until
a device run proves it. Narrowing `ID` to `ID@native` counts as shrinking the list.
