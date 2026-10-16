# ADR 0001: A typed adapter registry instead of a DI framework

- **Status:** Accepted, 2026-10-07

## Context

The reference design (fineract-backoffice-ui, ADR 0003 and ADR 0006) keeps every replaceable
library and the generated API client behind contracts, using Angular injection tokens. React has
no injector.

## Decision

The registry is a small typed `AdapterRegistry`:

- `token<T>()` names a contract;
- defaults are lazy factories registered in one composition root (`app-registry.ts`);
- overrides win, which is how tests and mocked builds swap implementations;
- `useAdapter()` reads the registry from context.

Platform variants are separate files (`*.native.ts` and `*.ts`) resolved by Metro. Contracts are
Promise-based rather than RxJS.

## Consequences

- There is no third-party dependency and no decorators.
- Every adapter is constructed in one place.
- Tests build a registry from `createFakeAdapters()` and assert on requests, not on library calls.
