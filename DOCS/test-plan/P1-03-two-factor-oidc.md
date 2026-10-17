# P1-03: Two-factor and identity-provider (OIDC) sign-in

## Scope

**Two-factor (2FA).**

1. When `POST /authentication` answers `isTwoFactorAuthenticationRequired`, the sign-in screen
   asks where to send a one-time code (`GET /twofactor`), then sends it
   (`POST /twofactor?deliveryMethod=…`).
2. It asks for the code and exchanges it (`POST /twofactor/validate?token=…`).
3. Only then is the user signed in.
4. From then on every request carries `Fineract-Platform-TFA-Token` alongside `Authorization`.
5. Sign-out invalidates the token at the server (`POST /twofactor/invalidate`) before forgetting
   it.

While the second factor is pending, the session is **not** signed in: the guarded routes send the
user back to the step. The pending state is kept in secure storage (tab-scoped on web), so a reload
resumes the step, as fineract-backoffice-ui does, instead of returning to the password form. The behaviour follows fineract-backoffice-ui's `DOCS/TWO-FACTOR.md`.

**OIDC.**

- When the deployment configures an identity provider, sign-in offers "Sign in with <label>"
  above the password form. The password form stays.
- **Where that configuration comes from:**
  - **Web:** an optional deployment file `/config.json`, read once at start, with
    `{ "oidc": { "issuer", "clientId", "scopes"?, "label"? } }`. A missing file means no provider.
    Operators change it without rebuilding, and the e2e specs serve it per test.
  - **Native:** the build variables `EXPO_PUBLIC_OIDC_ISSUER`, `EXPO_PUBLIC_OIDC_CLIENT_ID`,
    `EXPO_PUBLIC_OIDC_SCOPES` and `EXPO_PUBLIC_OIDC_LABEL`.
- The flow is the authorization-code flow with PKCE, through `expo-auth-session`: a popup on web,
  the system browser on native.
- The access token becomes a `Bearer` credential. The session's user and permissions come from
  `GET /userdetails`.
- Without that configuration the screen is exactly as before.

**Backend constraint, recorded as a decision.** The backend exposes `GET /v1/userdetails` only when
it runs with `fineract.security.oauth2.enabled`. The newer OIDC federation (1.15) validates Bearer
tokens but offers no endpoint that reports the caller's permissions. Where `/userdetails` is
missing (404) or refuses the token (401/403), the app does **not** sign the user in with an empty
permission set. It explains that the server cannot complete identity-provider sign-in.

## Mock data

`e2e/web/mocks/two-factor.ts` and `e2e/web/mocks/oidc.ts` provide the mocks:

- **Channels:** `email → a***@example.org`, plus `sms → +1******89` for the choice scenarios.
- **Accepted code:** `NMKH4`. A wrong code answers what the backend answers: a 403 domain-rule
  violation with `The provided one time token is invalid`.
- **Mock identity provider:** issuer `https://idp.test/realms/bank`, with discovery, authorize and
  token endpoints answered by `page.route`.

## E2E scenarios: two-factor (P1-SHELL-036 mocked, P1-SHELL-037 backend)

| ID              | Scenario                                                                                                                                                                                                           | Level          | Status |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------ |
| P1-SHELL-036/1  | **Given** an account that needs a second factor and one email channel, **when** the password is accepted, **then** the step names the channel (masked target) with a "Send code" action, and home is **not** shown | web            | green  |
| P1-SHELL-036/2  | **When** the code is sent and `NMKH4` entered, **then** the user lands on home. Every later API request carries `Fineract-Platform-TFA-Token: tfa-token-123` and the `Authorization` header                        | web            | green  |
| P1-SHELL-036/3  | **When** a wrong code is entered, **then** the user stays on the step, the field is cleared, and the server's reason ("one time token is invalid") is shown                                                        | web            | green  |
| P1-SHELL-036/4  | **After** a wrong code, the correct one still signs in                                                                                                                                                             | web            | green  |
| P1-SHELL-036/5  | **Given** two channels (email, SMS), **then** the step asks which to use, and the chosen one is sent as `deliveryMethod`                                                                                           | web            | green  |
| P1-SHELL-036/6  | **Given** no channel configured, **then** the step says so and offers only "Back to sign-in"                                                                                                                       | web            | green  |
| P1-SHELL-036/7  | **Given** sending fails (500), **then** the step returns to the channel choice with an error, and nothing is signed in                                                                                             | web            | green  |
| P1-SHELL-036/8  | **While** the step is pending, **when** `/home` or `/clients` is opened by URL, **then** the step is shown instead, and no non-`/twofactor` API request has been made                                              | web            | green  |
| P1-SHELL-036/9  | **When** "Back to sign-in" is chosen, **then** the password form returns, empty except server and tenant, and nothing is stored                                                                                    | web            | green  |
| P1-SHELL-036/10 | **Given** an account without a second factor, **then** sign-in goes straight to home and no `/twofactor` request is made                                                                                           | web            | green  |
| P1-SHELL-036/11 | **When** a 2FA user signs out, **then** `POST /twofactor/invalidate` is called with the token before sign-in is shown                                                                                              | web            | green  |
| P1-SHELL-036/12 | **When** a 2FA session reloads, **then** it stays signed in and keeps sending the TFA token                                                                                                                        | web            | green  |
| P1-SHELL-037/1  | **Against** the 2FA stack (`deploy/docker-compose-e2e-2fa.yml`, mail catcher), **when** signing in as `mifos`, **then** the step appears and the app makes no other API call                                       | web-backend    | green  |
| P1-SHELL-037/2  | **With** the code read from the mail catcher, sign-in completes and `/clients` loads with status 200                                                                                                               | web-backend    | green  |
| P1-SHELL-037/3  | **With** a wrong code, the backend's refusal reason is shown                                                                                                                                                       | web-backend    | green  |
| P1-SHELL-037/4  | **On a device**, the same flow completes with the emailed code                                                                                                                                                     | native-backend | red    |

## E2E scenarios: identity provider (P1-SHELL-024 mocked, P1-SHELL-025 backend)

| ID             | Scenario                                                                                                                                                                                                                                                                           | Level       | Status |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-SHELL-024/1 | **Given** no identity provider configured (no `/config.json` on web, or one without `oidc`), **then** sign-in shows no identity-provider button                                                                                                                                    | web         | green  |
| P1-SHELL-024/2 | **Given** a configured provider labelled "Bank SSO", **then** "Sign in with Bank SSO" sits above the password form, which still works                                                                                                                                              | web         | green  |
| P1-SHELL-024/3 | **When** "Sign in with Bank SSO" completes against the mock provider, **then** the token request carries a PKCE `code_verifier`, the app calls `/userdetails` with `Authorization: Bearer <access token>`, and the user lands on home with the permissions `/userdetails` reported | web         | green  |
| P1-SHELL-024/4 | **Given** `/userdetails` answers 404 (federation without `oauth2.enabled`), **then** the user stays on sign-in with "the server cannot complete identity-provider sign-in", and nothing is stored                                                                                  | web         | green  |
| P1-SHELL-024/5 | **When** the provider's window is closed or the user cancels, **then** sign-in remains, with no error and nothing stored                                                                                                                                                           | web         | green  |
| P1-SHELL-024/6 | **While** the second-factor step is shown, the identity-provider button is not offered                                                                                                                                                                                             | web         | green  |
| P1-SHELL-025/1 | **Against** a backend with `oauth2.enabled` and a Keycloak realm, a real provider sign-in reaches home and loads `/clients`                                                                                                                                                        | web-backend | red    |

## Status notes

- P1-SHELL-024/1 and P1-SHELL-036/10 passed before any implementation. They guard behaviour that
  already existed (no provider configured, no second factor), so they were green from the start.
  They were written so that this slice could not break them.

- **Against real servers:**
  - P1-SHELL-037/1–3 need the 2FA stack and Mailpit; they run in the `two-factor` project, nightly
    in their own job. First run against the stack on 2026-10-17: all three pass. P1-SHELL-037/2
    now also checks that `/clients` answers 200, which it had only waited for.
  - P1-SHELL-037/4 needs a device signed in to the 2FA stack, with the code read from Mailpit.
  - P1-SHELL-025/1 needs a Keycloak-backed stack that does not exist yet.
- **Defects the scenarios found during implementation:**
  - P1-SHELL-036/11 found the sign-out invalidator unwired in the composition root. A
    registry unit test now pins it.
  - P1-SHELL-036/8 required resuming the step after a reload, so the pending 2FA state is
    persisted (tab-scoped).
  - P1-SHELL-035/6 (from P1-02) raced the deployment-config load. The spec now waits for the
    shell before counting entries.

## Unit and component cases (written with the implementation)

- **`HttpTwoFactorApi`:**
  - `methods()` maps `{name, target}` and treats an empty body as `[]`;
  - `request(name)` posts `deliveryMethod`;
  - `validate(code)` answers the token, and a refused code rejects with an `AppError` of kind
    `domainRule` that carries the server's message;
  - `invalidate(token)` posts the token.
- **`SessionStore`:**
  - `beginTwoFactor(session)` enters `twoFactor`, where the pipeline gets the Basic credential and
    no TFA token, and a reload restores `twoFactor`, never `signedIn`;
  - `completeTwoFactor(token)` signs in with the token, and `authState` includes it;
  - `signOut` from `twoFactor` returns to `signedOut` without calling invalidate;
  - `signOut` with a TFA token calls the invalidator once, and still signs out if invalidate fails;
  - a persisted session restores its TFA token;
  - a `Bearer` session gives a Bearer credential.
- **`TwoFactorStep`** (component):
  - a single channel is collapsed and several are a choice;
  - no channel shows only the way back;
  - send then code then validate completes the sign-in;
  - a wrong code clears the field and shows the reason;
  - a send failure returns to the choice;
  - back signs out.
- **Deployment config:**
  - a missing, unreadable or invalid `/config.json` gives no OIDC and is not an error;
  - `oidc` needs `issuer` (https) and `clientId`, with defaults for scopes and label;
  - native reads the `EXPO_PUBLIC_OIDC_*` variables.
- **OIDC:**
  - `HttpUserDetailsApi` maps `/userdetails` to a `Session` with a Bearer credential;
  - 404, 401 and 403 become an `oidcUnsupported` error;
  - `LoginScreen` shows the provider button only when configured and not during the 2FA step.
