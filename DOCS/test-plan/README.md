# Test plan

Every behaviour is written down here **before** its tests and code. The order for each slice:

1. **Document.** Add the slice's scenarios to a `DOCS/test-plan/<phase>-<nn>-<slice>.md` file:
   e2e scenarios, plus the unit and component cases the implementation will need.
2. **Specify.** Write the e2e specs and Maestro flows that the documented scenarios name. Mark
   them expected-red ([../E2E.md](../E2E.md)).
3. **Implement**, until the specs pass. Then update each scenario's status in the document.

## Scenario IDs

A scenario is `<parity-row>/<n>`, for example `P1-SHELL-027/2`. The parity row comes from
`e2e/shared/parity-matrix.json`.

- **Web:** a Playwright test starts with `spec('P1-SHELL-027/2')`.
- **Native:** a Maestro flow starts with `# scenario: P1-SHELL-027/2`.

`npm run check:test-plan` (`scripts/check-test-plan.mjs`) enforces the mapping both ways:

- every e2e scenario in these documents is implemented by a spec or flow on each platform it
  lists, unless its status is `planned`;
- every `spec(…)` and `# scenario:` in the suites is documented here.

## Columns

| Column | Values                                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level  | `web` (Playwright, mocked API), `web-backend` (Playwright against the docker stack), `native` (Maestro, mocked), `native-backend` (Maestro against the stack) |
| Status | `planned`: documented, not specified yet. `red`: specified, expected to fail. `green`: passing                                                                |

A scenario lists every level it runs at, separated by commas. Its status describes the scenario
as a whole. Per-platform redness is tracked in `expected-red.json` (`ID@native`).

## Unit and component tests

Each slice document lists the unit and component cases its implementation needs. That list is the
design input. The authoritative inventory of what exists is generated:
[unit-test-catalogue.md](unit-test-catalogue.md) (`npm run docs:tests`), and CI fails when it is
out of date.

## Documents

| Document                                             | Slice                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [P0-foundation.md](P0-foundation.md)                 | Harness smoke test, About and disclaimer                       |
| [P1-01-sign-in.md](P1-01-sign-in.md)                 | Sign-in, session, sign-out reasons                             |
| [P1-02-shell-rbac.md](P1-02-shell-rbac.md)           | Navigation shell, permissions, route protection, Access Denied |
| [P1-03-two-factor-oidc.md](P1-03-two-factor-oidc.md) | Two-factor and identity-provider sign-in                       |
| [P1-04-offices-staff.md](P1-04-offices-staff.md)     | Offices and staff: lists, views, create and edit               |
| [unit-test-catalogue.md](unit-test-catalogue.md)     | Generated list of every unit and component test                |
