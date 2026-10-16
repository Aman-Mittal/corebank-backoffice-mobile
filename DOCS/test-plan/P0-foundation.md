# P0: Foundation

## E2E scenarios

| ID               | Scenario                                                                                                                                                                                                                                                | Level       | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P0-HARNESS-001/1 | **Given** a fresh start, **when** the app opens, **then** the sign-in screen shows username, password and submit, the page title is the app name, no script error is raised, and axe finds no WCAG A/AA violation (desktop and Pixel 7)                 | web, native | green  |
| P0-ABOUT-001/1   | **Given** the sign-in screen, **when** About is chosen, **then** the About screen states that the app is not an ASF project, not part of Apache Fineract and not endorsed by the ASF, and it shows the Apache-2.0 licence and the version. axe is clean | web, native | green  |
| P0-ABOUT-001/2   | **When** `/about` is opened directly, **then** the disclaimer is shown without signing in                                                                                                                                                               | web         | green  |

## Unit and component cases

- **Adapter registry:**
  - defaults are built once;
  - overrides win;
  - dependencies between defaults resolve;
  - a missing token is named in the error;
  - a cycle is reported.
- **Storage and secure storage:**
  - JSON round-trip under the declared key and scope;
  - corrupt values read as absent;
  - `clearScope` removes only this app's keys;
  - a throwing backend never throws to the caller;
  - the platform implementations map onto Web Storage, MMKV and SecureStore.
- **Download:**
  - filename sanitising (example table and a property test);
  - the object URL is always revoked;
  - native writes to the cache and opens the share sheet.
- **HTTP pipeline:**
  - origin check;
  - tenant, credential and TFA headers;
  - correlation ID;
  - session-expiry rule;
  - retry policy (statuses, backoff, idempotent writes, timeouts);
  - error classification (domain-rule vs permission 403, nested field errors).
- **Runtime config:**
  - defaults;
  - override round-trip;
  - an invalid address is ignored or refused.
- **i18n:**
  - language pick order;
  - interpolation;
  - a missing key echoes the key;
  - every catalogue has the same keys.
- **About screen:** renders the keys and version; renders Korean text.
