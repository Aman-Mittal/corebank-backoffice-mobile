# ADR 0002: Vitest for unit tests; e2e written first

- **Status:** Accepted, 2026-10-07

## Decision

**Unit and component tests run on Vitest 5**, in two projects:

- `node`: adapters, mappers, HTTP and scripts. Native modules are mocked at the import boundary.
- `web`: components through react-native-web in jsdom.

Jest and `jest-expo` are not used. That means no component tests against React Native's native
renderer: **on-device behaviour is covered by Maestro flows instead**, against real builds. This
is a deliberate trade. The components are the same on web and native, and what differs between
them is native modules, which belong in the device suite anyway.

**Feature work is e2e-first:** specs are written and committed red before the implementation.
`expected-red.json` and its ratchet keep "red on purpose" explicit and shrinking
([E2E.md](../E2E.md)).
