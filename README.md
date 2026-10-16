# CoreBank Backoffice (mobile + web)

> **Disclaimer.** This is an independent, community-built client that is compatible with the REST
> API of Apache Fineract®. It is **not** an Apache Software Foundation project, is **not** part of
> Apache Fineract, and is **not** endorsed by or affiliated with the ASF. Apache, Apache Fineract
> and Fineract are trademarks of The Apache Software Foundation. See [DISCLAIMER.md](DISCLAIMER.md).

A backoffice app for iOS, Android and the web, built with Expo (SDK 57) and React Native. It talks
to a core-banking backend over its REST API, through an adapter boundary.

Licensed under the [Apache License, Version 2.0](LICENSE). Every dependency, including dev tooling,
is checked against the ASF third-party licence policy ([DOCS/LICENSING.md](DOCS/LICENSING.md)).

## Status

**Phase 0 (foundation) is done:** the adapter registry and library adapters, the HTTP pipeline,
the generated API types, the e2e harness (Playwright for web, Maestro for native), lint, the
licence gates and CI.

**Phase 1 is in progress:**

- **Done:** sign-in and session ([P1-01](DOCS/test-plan/P1-01-sign-in.md)), the navigation shell
  with permissions and route protection ([P1-02](DOCS/test-plan/P1-02-shell-rbac.md)), and
  two-factor and identity-provider sign-in ([P1-03](DOCS/test-plan/P1-03-two-factor-oidc.md)).
- **Next:** offices and staff, then clients.

Modules from later phases open a guarded placeholder that names their phase. The
[parity matrix](e2e/shared/parity-matrix.json) lists all 113 behaviours planned across Phases 1–9.

## Quick start

```bash
nvm use                 # Node 22.22.3 (.nvmrc)
npm install
npm run setup           # spec (pinned, hash-checked) → API types, placeholder icons
npm start               # Expo dev server; press w for web, a for Android, i for iOS
```

The app targets `https://localhost:8443/fineract-provider/api`, tenant `default`. You can override
these at build time with `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_TENANT_ID`, or at run time on
the sign-in screen (Phase 1).

## Commands

| Command                                                       | What it does                                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm test` / `npm run test:ci`                                | Unit and component tests (Vitest 5; `node` + `web` projects), the latter with coverage |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Static checks                                                                          |
| `npm run test:eslint-rules`                                   | Tests for the local lint rules                                                         |
| `npm run check:licenses`                                      | ASF licence gate: Category X and unclassified licences fail                            |
| `npm run check:headers`                                       | Apache-2.0 headers, plus LICENSE, NOTICE and DISCLAIMER present                        |
| `npm run check:expected-red`                                  | The e2e-first ratchet ([DOCS/E2E.md](DOCS/E2E.md))                                     |
| `npm run check:testids` / `npm run i18n:check`                | testID and translation consistency                                                     |
| `npm run api:generate`                                        | Regenerate `src/api/generated` from `spec/openapi.json`                                |
| `npm run web:export && npm run e2e:web:mocked`                | Web e2e against the static export                                                      |
| `npm run e2e:stack`                                           | Docker backend for the `backend` e2e projects (needs about 2 GB free)                  |
| `npm run e2e:native`                                          | Maestro flows (needs a device or emulator and the Maestro CLI)                         |

## Documentation

- [DOCS/ADAPTERS.md](DOCS/ADAPTERS.md): the adapter boundary and how to add a domain contract
- [DOCS/E2E.md](DOCS/E2E.md): e2e-first workflow, parity matrix, Playwright and Maestro, resource limits
- [DOCS/LINT_POLICY.md](DOCS/LINT_POLICY.md) and [DOCS/SONAR.md](DOCS/SONAR.md): static analysis without LGPL tooling
- [DOCS/LICENSING.md](DOCS/LICENSING.md): dependency policy and recorded exceptions
- [DOCS/OFFLINE.md](DOCS/OFFLINE.md): what works offline and what does not
- [DOCS/RELEASING.md](DOCS/RELEASING.md): EAS builds and updates
- [DOCS/OPENAPI.md](DOCS/OPENAPI.md): the pinned spec, generated types and what is not committed
- [DOCS/test-plan/](DOCS/test-plan/README.md): every e2e scenario and unit case, written before the code
- [DOCS/adr/](DOCS/adr/): architecture decision records
