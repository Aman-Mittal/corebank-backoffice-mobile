# P1-15: Server refusals, client-side gates off, and office scope

## Scope

What the app shows when the server, not the app, draws the line. Behaviour follows
fineract-backoffice-ui's e2e specs `rbac-disabled-flag-backend` and `rbac-office-scoped-user`
(Apache-2.0).

### A refused read

A read the server refuses for the user's role (a 403 that is not a domain rule) is refused the
same way on every attempt. The shared failure state therefore says "Your role does not cover
this." and offers no "Try again": that retry is right after a timeout and a dead end here. Every
other failure keeps its message and its retry.

### Client-side gates switched off (`rbacEnabled: false`)

A deployment can switch the app's own permission gates off, as the reference can, for a backend
whose roles it does not trust the app to mirror:

- the setting is `rbacEnabled` in the deployment configuration: `/config.json` on web,
  `EXPO_PUBLIC_RBAC_ENABLED` on native. Anything but `false` keeps the gates on;
- with the gates off, the navigation shows every module, the route guard admits every screen, and
  every control is offered: the app checks nothing itself;
- the server still checks everything. A read it refuses shows the refusal state above, and a list
  the role does cover loads as usual.

### A user scoped to a branch office

The server limits what a user sees to their office and the offices below it. Nothing in the
permission codes says so, so the app has to make it visible:

- home names the user's office (P1-01 already does);
- the client list shows only the clients the server answers, so a branch user sees the branch's
  clients and not the head office's;
- a client outside the user's offices is answered as not found (404), not refused. Opening one by
  URL shows "This client doesn't exist, or you don't have permission to view it.", once; it is
  not Access Denied, as no permission is missing;
- a client in the user's own office opens as usual;
- the offices screen lists every office (it asks for all of them), but a user without
  `UPDATE_OFFICE` is offered no Edit on any (P1-04 already gates it).

**Out of scope:** institution-type feature flags (P1-SHELL-031), and turning off individual
modules.

## Mock data

- `config.json` is answered by the spec (`page.route`), with `rbacEnabled: false`.
- A refused list is `GET /offices` answered with the server's permission refusal (403,
  `error.msg.not.authorized`), overriding `organizationHandlers()`.

## E2E scenarios: client-side gates off (P1-SHELL-030)

| ID             | Scenario                                                                                                                                                                                                       | Level       | Status |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-SHELL-030/1 | **Given** `rbacEnabled: false` and `clerk` (`READ_CLIENT` only), **then** the navigation offers Offices and Users, and `/organization/offices` opens the offices screen rather than Access Denied              | web         | green  |
| P1-SHELL-030/2 | **When** the server refuses the offices list (403), **then** the screen says "Your role does not cover this." with no Try again; the clients list still loads with no failure                                  | web         | green  |
| P1-SHELL-030/3 | **Given** the gates on (no configuration), **then** a 500 still offers Try again, and a refused list (403) offers none                                                                                         | web         | green  |
| P1-SHELL-030/4 | **Against** the docker stack, with `rbacEnabled: false`, a user holding only `READ_CLIENT` opens the offices screen and is told their role does not cover it, with no Try again, while their client list loads | web-backend | green  |

## E2E scenarios: a user scoped to a branch (P1-SHELL-033)

| ID             | Scenario                                                                                                                                                                                   | Level       | Status |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------ |
| P1-SHELL-033/1 | **Against** the docker stack, a branch user (`READ_CLIENT`, `READ_OFFICE`) is told their office on home, and finds the branch's client but not the head office's in the client list        | web-backend | green  |
| P1-SHELL-033/2 | **Against** the docker stack, the branch user opening the head office's client by URL is told it doesn't exist or they may not view it, not Access Denied; their own office's client opens | web-backend | green  |
| P1-SHELL-033/3 | **Against** the docker stack, the branch user is shown the offices but offered no Edit on its own office                                                                                   | web-backend | green  |

## Unit and component cases

- **`parseDeploymentConfig`**: `rbacEnabled` is true unless the configuration says `false` (also
  as the string `"false"` from a build variable); it is read whether or not an identity provider
  is configured.
- **`usePermission` / `useGranted`**: with the gates off, every requirement is satisfied and the
  grant set is all functions.
- **`ErrorState`**: a permission refusal names the role and offers no retry; a network failure and
  a server error keep the retry.

## Status notes

- **Specified first**, then implemented: every scenario started red, and all passed locally
  (web against mocks, web-backend against the docker stack) on 2026-10-30.
- **A misclassification the stack exposed (P1-SHELL-030/4):** the server's own permission refusal
  (`error.msg.not.authorized`) fills `errors[]` with an entry on `id`, and the app read any 403
  with errors as a domain rule, so a refused list said "could not be loaded" and offered a retry.
  The classifier now checks that code first, and the mock answers the captured body
  (`stack.refusal.not-authorized.json`).
