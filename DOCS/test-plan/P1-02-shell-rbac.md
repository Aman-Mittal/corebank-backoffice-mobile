# P1-02: Navigation shell, permissions and route protection

## Scope

- **Signed-in shell.** A permanent sidebar at 768 dp and wider. Below that, a header with a menu
  button that opens a modal drawer.
- **Navigation catalogue.** Every backoffice module, with its required permission, ported from
  fineract-backoffice-ui's navigation config (Apache-2.0).
- **Permission rule:**
  - `ALL_FUNCTIONS` grants everything.
  - `ALL_FUNCTIONS_READ` grants a requirement made up entirely of `READ_*` codes.
  - Otherwise any one listed code is enough (OR), unless the route says _all_.
- **Route protection.**
  - A gated URL the user cannot open shows **Access Denied** in place. The URL is kept, so Back
    works.
  - Signed out, the same URL goes to sign-in.
- **The navigation shows exactly what the routes admit.** Both use one function.
- **Placeholders.** Modules that later phases build open a placeholder that says so. It is
  guarded like the real screen.

**Out of scope, documented as `planned`:**

- deployment flags: `rbacEnabled`, institution type and navigation overrides (P1-SHELL-031,
  P1-SHELL-030; they arrive with deployment customisation);
- 403-on-list feedback (P1-SHELL-027/4; it needs the clients list);
- office scoping (P1-SHELL-033).

## Personas (mocked sign-in)

`e2e/web/mocks/personas.ts` gives each persona a `POST /authentication` response.

| Persona       | Permissions                    |
| ------------- | ------------------------------ |
| `superuser`   | `ALL_FUNCTIONS`                |
| `clerk`       | `READ_CLIENT`                  |
| `creator`     | `READ_CLIENT`, `CREATE_CLIENT` |
| `reader`      | `ALL_FUNCTIONS_READ`           |
| `loanOfficer` | `READ_LOAN`                    |
| `nobody`      | none (`[]`)                    |
| `junk`        | `NOT_A_REAL_CODE`              |

## E2E scenarios

### Shell

| ID             | Scenario                                                                                                                                                                                                                       | Level               | Status |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------ |
| P1-SHELL-023/1 | **At** 390×844, **when** signed in, **then** the navigation starts closed and is out of the tab order. **When** the menu button is tapped, **then** a modal drawer opens (`role=dialog`, `aria-modal`) and focus moves into it | web                 | green  |
| P1-SHELL-023/2 | **At** 390×844, the drawer closes on its close button, on Escape, and on the backdrop                                                                                                                                          | web                 | green  |
| P1-SHELL-023/3 | **At** 390×844, choosing a destination in the drawer navigates there and closes the drawer                                                                                                                                     | web, native-backend | green  |
| P1-SHELL-023/4 | **At** 390×844, the signed-in screen does not scroll sideways, and every header control is at least 44×44                                                                                                                      | web                 | green  |
| P1-SHELL-023/5 | **At** 1280×800, the sidebar is always visible and there is no menu button                                                                                                                                                     | web                 | green  |
| P1-SHELL-023/6 | **When** sign-out is chosen from the shell, **then** the session ends and sign-in shows without a notice                                                                                                                       | web                 | green  |

### Navigation follows permissions

| ID             | Scenario                                                                                                                                                                                                                                                                                             | Level       | Status  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------- |
| P1-SHELL-027/1 | **Given** `clerk`, **then** the navigation shows Clients and does not show Users, Roles, Journal entries or Chart of accounts                                                                                                                                                                        | web         | green   |
| P1-SHELL-027/2 | **Given** `clerk`, **when** `/security/users`, `/security/roles/create` or `/accounting/journal-entries` is opened by URL, **then** Access Denied is shown and the URL is unchanged. **When** `/clients` is opened, **then** it is admitted                                                          | web         | green   |
| P1-SHELL-027/3 | **Given** `clerk`, **when** a module entry is chosen in the navigation, **then** the module opens (the placeholder for a later phase names that phase)                                                                                                                                               | web         | green   |
| P1-SHELL-027/4 | **Given** a list endpoint answers 403, **then** the list says access is denied, not "no records"                                                                                                                                                                                                     | web         | planned |
| P1-SHELL-035/1 | **Given** `superuser`, **then** every navigation group is shown and a sample of gated routes (Clients, Users, Journal entries, Scheduler jobs) is admitted                                                                                                                                           | web         | green   |
| P1-SHELL-035/2 | **Given** `nobody`, **when** signed in, **then** the user lands on home rather than being stranded at sign-in. Only ungated entries are shown (Dashboard, Profile, and the modules the reference leaves ungated), each opens without Access Denied, and every gated sample route shows Access Denied | web         | green   |
| P1-SHELL-035/3 | **Given** `junk` (an unrecognised code), **then** it is treated like `nobody`                                                                                                                                                                                                                        | web         | green   |
| P1-SHELL-035/4 | **Given** no session, **when** a gated route is opened, **then** sign-in is shown, not Access Denied                                                                                                                                                                                                 | web         | green   |
| P1-SHELL-035/5 | **Access Denied**: one heading, focus moved to it, announced politely (`role=status`). It names the permissions the screen needs and offers a working way back to home                                                                                                                               | web         | green   |
| P1-SHELL-035/6 | **Given** `clerk`, **for** a sample of entries, an entry shown in the navigation is admitted by URL, and one not shown is refused                                                                                                                                                                    | web         | green   |
| P1-SHELL-034/1 | **Given** `nobody`, **then** home names the user, sign-out works, and no navigation entry leads to Access Denied                                                                                                                                                                                     | web         | green   |
| P1-SHELL-002/1 | **Given** `reader` (`ALL_FUNCTIONS_READ`), **then** `/clients` is admitted and `/clients/new` (CREATE_CLIENT) is refused                                                                                                                                                                             | web         | green   |
| P1-SHELL-002/2 | **Given** `creator`, **then** both `/clients` and `/clients/new` are admitted. **Given** `superuser`, the same                                                                                                                                                                                       | web         | green   |
| P1-SHELL-032/1 | **Given** `loanOfficer`, **then** Work queues (READ_LOAN _or_ READ_CLIENT) is admitted. **Given** `clerk`, it is too. **Given** `nobody`, it is refused                                                                                                                                              | web         | green   |
| P1-SHELL-032/2 | **Given** a real role with only READ_CLIENT (created by API in setup), **then** `/clients` is admitted, `/security/users` is refused by the app, and `GET /users` answers 403 from the backend                                                                                                       | web-backend | green   |
| P1-SHELL-032/3 | **Given** a restricted session, **when** the page reloads, **then** the same permission boundary holds                                                                                                                                                                                               | web         | green   |
| P1-SHELL-028/1 | **Given** a real restricted user, **then** they hold exactly their role's permissions and the superuser used by the rest of the suite is unaffected                                                                                                                                                  | web-backend | green   |
| P1-SHELL-031/1 | **Given** `rbacEnabled = false`, **then** the full navigation is shown                                                                                                                                                                                                                               | web         | planned |
| P1-SHELL-030/1 | **Given** `rbacEnabled = false`, the backend still refuses what the role does not cover                                                                                                                                                                                                              | web-backend | planned |
| P1-SHELL-033/1 | **Given** a branch-office user, **then** only that office's clients are listed                                                                                                                                                                                                                       | web-backend | planned |

## Status notes

- P1-SHELL-023/3 runs on web and, on every PR, in the Android e2e job (an emulator signed in to the docker stack).
- P1-SHELL-032/2 and P1-SHELL-028/1 were red against the docker stack because the user factory's
  password broke the server's default policy, which forbids a character twice in a row
  (`Pa55-…`). With that fixed both pass (2026-10-17). The nightly pending probe now posts each
  still-red spec's error as a "Still red" annotation, which is how such a cause shows up.
- **Newer servers add `FACTOR_PASSWORD`** to every session's permission list (Spring Security's
  authentication-factor marker; seen on CI's `apache/fineract:latest`, 2026-10-17). It records how
  the user signed in and grants nothing, so P1-SHELL-028/1 compares the list without `FACTOR_*`
  codes.
- **Defects the scenarios found during implementation:**
  - Two specs passed on the old build: P1-SHELL-002/2 asserted only "no Access Denied", and
    P1-SHELL-023/6 found the home screen's sign-out button. Both now assert positively.
  - axe (P1-SHELL-035/5) found the navigation list's `listitem` semantics missing.

## Unit and component cases (written with the implementation)

- **`permissionsSatisfy(granted, required, { all })`:**
  - `ALL_FUNCTIONS` grants everything;
  - `ALL_FUNCTIONS_READ` grants an all-`READ_*` requirement, never a mixed one;
  - OR is the default, and `all` means AND;
  - an empty grant set grants nothing gated;
  - a property test checks that adding a code never removes access.
- **Route access (`accessFor(path)`):**
  - exact match;
  - a nested path inherits its nearest declared ancestor (`/clients/42/edit` from `/clients`);
  - a more specific declaration wins (`/clients/new` needs CREATE_CLIENT);
  - an undeclared path is ungated;
  - a trailing slash and a query string are ignored.
- **Navigation filter (`visibleNav(granted)`):**
  - hides the entries the user cannot open;
  - drops a group left empty;
  - keeps ungated entries;
  - keeps catalogue order.
- **Navigation and routes agree** (property test over random grant sets): every visible entry's
  route is admitted, and every hidden entry's route is refused.
- **Catalogue integrity:**
  - ids are unique;
  - routes are unique and start with `/`;
  - every label key exists in every locale;
  - every permission code is upper-case.
- **`usePermission` / `<Can>`** (component): renders the children when allowed and the fallback
  otherwise, and re-renders when the session changes.
- **`<RequireAccess>`** (component): renders the screen when admitted and Access Denied
  otherwise, naming the required codes; it does not redirect.
- **Drawer** (component):
  - opens as a modal dialog;
  - focus moves into it;
  - Escape and the backdrop close it;
  - choosing an entry closes it.
