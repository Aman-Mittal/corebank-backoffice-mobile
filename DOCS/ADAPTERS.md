# Adapters

The adapter boundary is the core design rule of this codebase. It is adapted from
fineract-backoffice-ui (its `DOCS/ADAPTERS.md`, ADR 0003 and ADR 0006), with Angular's injection
tokens replaced by a small typed registry. ADR 0001 records why.

## The pieces

| Piece            | File                                                  | Role                                                             |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Token            | `token<T>('Name')` in `src/core/adapters/registry.ts` | Names a contract                                                 |
| Registry         | `AdapterRegistry`                                     | Builds defaults lazily, lets overrides win, detects cycles       |
| Composition root | `src/core/app-registry.ts`                            | Registers every default implementation                           |
| Provider / hook  | `AdapterProvider`, `useAdapter(TOKEN)`                | Makes the registry available to components                       |
| Fakes            | `src/testing/fake-adapters.ts`                        | In-memory implementations; tests assert on what code _asked for_ |

## Library adapters

| Token            | Wraps                 | Web                    | Native                                  |
| ---------------- | --------------------- | ---------------------- | --------------------------------------- |
| `STORAGE`        | key-value persistence | local/sessionStorage   | MMKV (device) and memory (session)      |
| `SECURE_STORAGE` | credentials           | sessionStorage         | Keychain / Keystore (expo-secure-store) |
| `I18N`           | i18next               | same                   | same                                    |
| `DOWNLOAD`       | saving files          | object URL plus anchor | cache file plus share sheet             |
| `NETWORK`        | connectivity          | `navigator.onLine`     | NetInfo                                 |
| `CLOCK`          | time                  | `Date.now`             | same                                    |

Platform files are chosen by Metro: `platform-storage.ts` is the web build and
`platform-storage.native.ts` is the native one. The composition root imports each module once, the
same way on every platform. ESLint (`no-restricted-imports`) keeps each library inside its adapter.

Guarantees that carry over from the reference:

- **Reads never throw, and writes never throw.** A corrupt value reads as absent, and a denied
  store loses persistence rather than the screen.
- **Every stored key is declared** in `storage-keys.ts`, with its scope. Credentials are never in
  `STORAGE`; they live in `SECURE_STORAGE`.
- **Downloaded filenames are sanitised**: basename only, no reserved or control characters,
  truncated with the extension kept.

## The API: generated types → domain contracts

`spec/openapi.json` is preprocessed (`scripts/preprocess-spec.mjs` gives stable operationIds) and
turned into **types only** by `openapi-typescript`. Those land in `src/api/generated/openapi.d.ts`,
and `openapi-fetch` calls them through the HTTP pipeline (`src/core/http`). The rule
`local/no-generated-api-import` lets only `src/core/adapters/api/**` import those types.

When a screen needs a domain, add a contract next to the others:

1. `src/core/adapters/api/<domain>.api.ts` holds the **domain model** and the contract interface,
   with a `token`. The model is not the generated type renamed:
   - ids are non-optional;
   - absence is `null`;
   - dates are ISO strings produced by `toIsoApiDate()`, which accepts both the `[y, m, d]` arrays
     the server sends and strings.
2. `http-<domain>.api.ts` is the implementation over `ApiClient`. Its rules:
   - Map payloads in exported, tested functions.
   - Write payload disagreements down as `Omit<Generated, 'x'> & { x: … }`.
   - Add `ISO_DATE_FIELDS` to dated writes.
   - Strip blanks with `withoutBlanks()`.
   - Use `call()` to turn failures into `AppError`.
3. Register the implementation in `app-registry.ts` and add a fake.
4. Test the mappers against **captured real payloads** (`src/testing/fixtures`), never against
   objects built from the generated types.

Never branch on a status's localised `value`; use its boolean flags or its `code`.

## HTTP pipeline

The pipeline is `correlationId → auth → sessionExpiry → retry → fetch`.

- **correlationId:** sets `X-Correlation-ID`.
- **auth:** adds the tenant headers, `Authorization` and the TFA token, and only to the configured
  API origin.
- **sessionExpiry:** a 401 on a request that _carried_ credentials ends the session.
- **retry:** retries only GET, or requests marked with `IDEMPOTENT_HEADER`, on 408/429/502/503/504
  and network errors, backing off 300 ms then 900 ms. A per-attempt timeout is never retried.
- **Failures become `AppError`:** each has a `kind` (`network`, `timeout`, `unauthorized`,
  `forbidden`, `domainRule`, `validation`, `notFound`, `server`) and field messages. A domain-rule
  403 is kept apart from a permission 403.
