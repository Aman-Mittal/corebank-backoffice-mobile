# P1-14: Global search, navigation shortcuts and breadcrumbs

## Scope

Finding a record or a screen by typing, and seeing where a nested screen sits. Behaviour follows
fineract-backoffice-ui's header search and breadcrumb, and its e2e specs
`global-search-navigation`, `global-search-nav-shortcuts` and `breadcrumb` (Apache-2.0).

### Global search

The reference puts a search box in its header. On a phone the header has no room for one, so the
search here is its own screen, `/search`, the "Search" entry the navigation already lists. It
needs no permission of its own.

- Nothing is searched until the query has two characters: the reference does not send a
  one-character search. Until then the screen says to type more.
- Typing is debounced (300 ms, as the reference), so a phrase typed straight through sends one
  request: `GET /search?query=<query>&resource=clients,loans,savings`.
- Each record shows its name, account number and office (`parentName`), and opens its screen:
  a client `/clients/<id>`; a loan `/loans/<id>` and a savings account
  `/products/savings-accounts/<id>`, which open their module's placeholder until Phases 3 and 4
  build them. Record types the app does not open (anything else the server returns) are not
  listed.
- With no records and no shortcuts, the screen says there are no results. If the record search
  fails, the shortcuts still show, with a note that records could not be searched.

### Navigation shortcuts

Above the records, the screens whose name matches the query (case-insensitive, on the name in the
user's language), at most 8, in navigation order: a screen the record search can never return,
such as Offices. Only screens the user may open are offered: a shortcut the user cannot follow
would disclose the screen and end at Access Denied. A shortcut opens its screen.

### Breadcrumbs

A screen below a module's own page shows a trail from the module down to where the user is:

- the trail is made of the declared routes above the current path (navigation entries and the
  extra routes such as `/clients/new`), each a link, then the current screen's title;
- a module's own page (`/clients`, `/organization/offices`) has no trail, as it would be a
  single crumb;
- so `/clients/new` shows "Clients › New client", `/clients/1` shows "Clients › Ada Lovelace", and
  `/organization/offices/new` shows "Offices › New office". A crumb opens its page.

**Out of scope:** keyboard shortcuts for search (P1-SHELL-016), groups and other record types in
the results (their modules come later), and recent searches.

## Mock data

`e2e/web/mocks/search.ts`: `GET /v1/search` records every query and answers, for any query
containing "ada" (case-insensitive), Ada Lovelace (client 11), "Ada Lovelace - Loan" (loan 22) and
"Ada Lovelace - Savings" (savings account 33), each in the server's shape (captured from the e2e
stack for clients; loans and savings follow the same shape). Anything else answers `[]`;
`failSearch` answers 500.

## E2E scenarios: global search (P1-SHELL-014)

| ID             | Scenario                                                                                                                                                                                                                                            | Level                       | Status |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| P1-SHELL-014/1 | **Given** `superuser` on the Search screen, **when** "A" is typed, **then** nothing is requested and the screen asks for more; **when** "Ada" is typed straight through, **then** exactly one search is sent, with `resource=clients,loans,savings` | web                         | green  |
| P1-SHELL-014/2 | **Then** the client result shows its account number and office and opens `/clients/11`; the loan result opens `/loans/22`; the savings result opens `/products/savings-accounts/33`                                                                 | web                         | green  |
| P1-SHELL-014/3 | **When** nothing matches, **then** the screen says there are no results; **when** the search fails, **then** matching shortcuts still show with a note that records could not be searched                                                           | web                         | green  |
| P1-SHELL-014/4 | **Against** the docker stack, a client seeded with a unique name is found by it and opened                                                                                                                                                          | web-backend, native-backend | green  |

## E2E scenarios: navigation shortcuts (P1-SHELL-013)

| ID             | Scenario                                                                                                                                                       | Level | Status |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-SHELL-013/1 | **When** "Offices" is typed and no record matches, **then** the Offices shortcut is offered, and choosing it opens `/organization/offices`                     | web   | green  |
| P1-SHELL-013/2 | **Given** `clerk` (`READ_CLIENT` only), **when** "Users" is typed, **then** no Users shortcut is offered; **when** "Clients" is typed, the Clients shortcut is | web   | green  |

## E2E scenarios: breadcrumbs (P1-SHELL-005)

| ID             | Scenario                                                                                                                                                                        | Level | Status |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-SHELL-005/1 | **Given** `clientAdmin`, **then** `/clients` has no breadcrumb trail; `/clients/new` shows "Clients › New client", and the Clients crumb opens `/clients`, which again has none | web   | green  |
| P1-SHELL-005/2 | **Then** `/clients/1` shows "Clients › Ada Lovelace", and `/organization/offices/new` (as `officeAdmin`) shows "Offices › New office"                                           | web   | green  |

## Unit and component cases

- **`HttpSearchApi`**: maps the captured response (`stack.search.json`): id, name, account
  number, office and the type; drops record types it does not know; asks with the three
  resources.
- **`searchRoutes`**: matches labels case-insensitively in the given language, keeps navigation
  order, caps at 8, and offers only what the grant set permits.
- **`breadcrumbTrail`**: no trail for a module's page; ancestors for nested paths, using the
  extra routes' labels; ignores a query string.
- **Components** (`SearchScreen`): the two-character minimum, one request per settled query,
  shortcuts before records, the no-results and failure states.

## Status notes

- **Specified first**, then implemented: every scenario started red. The web scenarios and the
  web-backend scenario passed locally against the docker stack on 2026-10-30; the Android flow
  (P1-SHELL-014/4) runs in CI.
- **Captured shapes** (e2e stack, 2026-10-30): `stack.search.json`, three clients. The stack has
  no loans or savings yet, so those results follow the reference spec's shape (`LOAN`,
  `SAVINGSACCOUNT`). The server accepts a one-character search; the two-character minimum is the
  client's, as in the reference.
