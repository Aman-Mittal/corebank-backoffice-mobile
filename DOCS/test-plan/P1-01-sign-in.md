# P1-01: Sign-in, session and sign-out reasons

**Scope:**

- the sign-in form (server, tenant, username, password);
- session persistence;
- sign-out;
- the reason shown after an involuntary sign-out.

Two-factor and OIDC sign-in are a separate slice ([P1-03](P1-03-two-factor-oidc.md)).

**Data:** the mocked API accepts `mifos` / `password` (`e2e/web/mocks/api.ts`). Native-backend
flows use the docker stack's demo user.

## E2E scenarios

| ID             | Scenario                                                                                                                                                                                                                                                          | Level               | Status |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------ |
| P1-SHELL-019/1 | **When** sign-in opens, **then** server and tenant are pre-filled from the build defaults and submit stays disabled until username, password and tenant are all filled. Clearing the tenant disables it again. axe is clean                                       | web                 | green  |
| P1-SHELL-019/2 | **When** the server address is not http(s) (e.g. `ftp://…`), **then** submit is disabled and the field explains why                                                                                                                                               | web                 | green  |
| P1-SHELL-020/1 | **Given** valid credentials and a typed tenant `acme`, **when** submitted, **then** the request carries tenant `acme` and no `Authorization` header, the body is exactly `{username, password}`, and the user lands on `/home`, which shows their name and office | web, native-backend | red    |
| P1-SHELL-020/2 | **Given** a wrong password, **when** submitted, **then** the user stays on sign-in with a "username or password" error, the password is cleared, and editing a field removes the error                                                                            | web, native-backend | red    |
| P1-SHELL-020/3 | **Given** the server refuses the connection, **when** submitted, **then** the error says the server cannot be reached, not that the credentials are wrong                                                                                                         | web                 | green  |
| P1-SHELL-020/4 | **When** Enter is pressed in the password field of a complete form, **then** it signs in                                                                                                                                                                          | web                 | green  |
| P1-SHELL-021/1 | **At** 375×667, **then** submit is in the viewport and nothing overflows sideways                                                                                                                                                                                 | web                 | green  |
| P1-SHELL-021/2 | **At** 768×1024, the same                                                                                                                                                                                                                                         | web                 | green  |
| P1-SHELL-021/3 | **At** 1280×720, the same                                                                                                                                                                                                                                         | web                 | green  |
| P1-SHELL-003/1 | **Given** no session, **when** `/home` is opened, **then** sign-in is shown                                                                                                                                                                                       | web                 | green  |
| P1-SHELL-003/2 | **Given** a signed-in tab, **when** it reloads, **then** the user is still signed in. **When** they sign out, **then** sign-in is shown without a notice, and `/home` is refused again                                                                            | web, native-backend | red    |
| P1-SHELL-003/3 | **Given** a signed-in session, **then** the credential appears nowhere in `localStorage`                                                                                                                                                                          | web                 | green  |
| P1-SHELL-022/1 | **Given** a session, **when** an authenticated request answers 401, **then** the user is returned to sign-in with `reason=session-expired` and an "expired" notice                                                                                                | web                 | green  |
| P1-SHELL-022/2 | **When** sign-in opens with `reason=inactivity`, **then** it explains an inactivity sign-out                                                                                                                                                                      | web                 | green  |
| P1-SHELL-022/3 | **When** sign-in opens with `reason=session-expired`, **then** the notice says expired and does not mention inactivity                                                                                                                                            | web                 | green  |
| P1-SHELL-022/4 | **When** sign-in opens with no reason, or one it does not recognise, **then** no notice is shown                                                                                                                                                                  | web                 | green  |

Three scenarios are `red` only because their `native-backend` flows have not run on a device yet.
Those flows are `pending`, and their IDs are listed as `@native` in `expected-red.json`. On web
they are green.

## Unit and component cases

- **`HttpAuthApi` / `mapSession`** (captured payload):
  - maps every field, upper-cases and trims permissions, keeps the tenant;
  - reads the two undeclared flags;
  - refuses a session with no key;
  - posts the typed tenant;
  - a 401 becomes `unauthorized`.
- **`HttpOfficeApi` / `mapOffice`** (captured payload):
  - converts `[y, m, d]` dates and reads the undeclared parent fields;
  - an office with no id throws;
  - `list` passes `includeAllOffices` only when asked, and an empty body becomes `[]`;
  - create and update add the date format and locale and drop blank fields;
  - create answers the id;
  - errors become `AppError`.
- **`SessionStore`:**
  - starts `restoring`, and restores to signed-out when nothing is persisted;
  - persists to secure storage and restores;
  - discards a corrupt session;
  - gives the pipeline credentials only while signed in;
  - concurrent sign-outs keep the first reason;
  - only known reasons are recognised.
- **Composition root:** a pipeline 401 signs the session out as `session-expired`.
- **`LoginScreen`** (component):
  - submit gating with server validation;
  - typed tenant, saved server and stored session, then navigation home;
  - credential error, cleared password, error removed on edit;
  - network error;
  - a two-factor account is not signed in;
  - known and unknown sign-out reasons;
  - redirect when already signed in.
