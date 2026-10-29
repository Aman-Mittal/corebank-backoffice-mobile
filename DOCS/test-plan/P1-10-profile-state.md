# P1-10: Profile, and session and permission state in Redux

## Scope

**The profile screen** (`/profile`, ungated: every signed-in user has one). Behaviour follows
fineract-backoffice-ui's `features/profile/user-profile.component` (Apache-2.0), which has no e2e
spec of its own:

- the user's record is read from `GET /users/<id>`, the id being the session's. Not
  `GET /userdetails`: it is missing from some server builds, and it lacks the user's roles;
- it shows the username, the display name (first and last name), the office with its id, the
  email and the roles;
- a failed read shows the error state with "Try again", never an empty profile;
- **Change password** opens a form in place (`aria-expanded`). It shows the active password
  policy from `GET /passwordpreferences`, or nothing when that read fails. Save is disabled until
  both fields are filled and match; a mismatch says so. Save sends
  `POST /users/<id>/pwd { password, repeatPassword }`, then closes the form and says the password
  was changed. A refusal is shown in the form, which stays open. Cancel closes it and clears both
  fields.

**State in Redux** ([ADR 0004](../adr/0004-redux-client-state.md)). The session and the profile
move into a Redux Toolkit store; permissions become selectors over the session. Behaviour is
unchanged, and the RBAC and session scenarios of P1-01, P1-02 and P1-03 are the regression
suite. The one new behaviour is that the profile belongs to the session: it is dropped when the
session ends, so the next user never sees the last one's record.

**Out of scope:** editing the user's own name or email (that is user administration, Phase 7),
and the forced password change at sign-in (`shouldRenewPassword`).

## Mock data

`e2e/web/mocks/profile.ts`, `profileHandlers(options)`:

- `GET /users/1` answers **mifos**: App Administrator, `mifos@example.org`, Head Office (1),
  roles "Super user". `GET /users/7` answers **clerk**: Clara Clerk, Kampala Branch (2), roles
  "Clerk".
- `GET /passwordpreferences` answers the active policy "Password must be at least 6 characters".
- `POST /users/<id>/pwd` accepts matching passwords of 6 or more characters and otherwise
  refuses with a 400 the server's way.
- Options: `failProfileOnce` (the next user read answers 500) and `noPolicy` (the policy read
  answers 403).

## E2E scenarios: profile (P1-SHELL-038)

| ID             | Scenario                                                                                                                                                                                                                                                              | Level                      | Status |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------ |
| P1-SHELL-038/1 | **Given** `superuser`, **when** Profile is chosen in the navigation, **then** `/profile` shows "mifos", "App Administrator", "Head Office (1)", the email and the role "Super user", read from `GET /users/1`                                                         | web                        | green  |
| P1-SHELL-038/2 | **When** the user read fails, **then** the error state is shown with Try again, and trying again shows the profile                                                                                                                                                    | web                        | green  |
| P1-SHELL-038/3 | **When** Change password is opened, **then** it is expanded and shows the policy; Save stays disabled until both fields match, a mismatch says so, and Save sends `POST /users/1/pwd { password, repeatPassword }`, closes the form and says the password was changed | web                        | green  |
| P1-SHELL-038/4 | **When** the server refuses the new password, **then** its reason is shown in the open form; **when** the policy read fails, no policy is shown; Cancel closes the form and clears it                                                                                 | web                        | green  |
| P1-SHELL-038/5 | **When** mifos signs out and `clerk` (user 7) signs in, **then** the profile shows Clara Clerk from `GET /users/7`, and mifos's record is never shown                                                                                                                 | web                        | green  |
| P1-SHELL-038/6 | **Against** the docker stack, the profile of `mifos` shows its username, its office "Head Office" and the role "Super user"                                                                                                                                           | web-backend,native-backend | green  |

## Unit and component cases

- **`session` slice**: each action gives its state; `selectGranted` is empty unless signed in and
  returns the same array for the same session; `selectPermitted` applies `permissionsSatisfy`.
- **`SessionStore` over the store**: the existing suite (`session-store.test.ts`) passes
  unchanged; listeners hear session changes only, not other slices' actions.
- **`profile` slice**: `loadProfile` goes loading, loaded or failed (with a serializable error);
  `loadPasswordPolicy` keeps the active policy's description, or `null` on failure;
  `changePassword` goes saving, then saved or failed; signing out or in resets the slice.
- **`HttpProfileApi`**: maps `GET /users/{id}` (absent fields → `null`, roles by name); reads the
  policy from an object or a list; posts `{ password, repeatPassword }`.
- **`ProfileScreen`**: shows the record; Save follows the fields; a mismatch, a refusal and the
  policy are shown; Cancel clears.
- **`usePermission` / `<Can>` / `RequireAccess`**: unchanged behaviour, now through the store.

## Status notes

- **Specified first**, then implemented: every scenario started red.
- **P1-SHELL-038/6** was not run locally (the docker stack and the emulator are too heavy to run
  beside other work on the dev machine); the CI `Web (backend)` and `Native (Android, Maestro)`
  jobs run it.
