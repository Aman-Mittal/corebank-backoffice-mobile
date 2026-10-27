# P1-09: List paging and load failures

## Scope

How a list behaves across pages, and what it shows when its load fails. Behaviour follows
fineract-backoffice-ui's e2e specs `list-pagination` and `list-load-failure` (Apache-2.0).

**Paging** applies to the clients list, the one list the server pages (offices and staff come back
whole). P1-CLIENTS-003/3 already covers Next and Previous across two pages. This slice adds:

- **First** and **Last**, beside Previous and Next. Last asks for the offset of the final page;
  each is disabled where it would not move;
- the search is kept while paging, and a changed search starts again from the first page;
- the page survives opening a client and coming back: the page and the search are kept in the
  list's URL (`/clients?page=2&q=ada`), so Back, a reload and a shared link all land on the same
  page. A page past the end (a link kept after clients were closed) shows the last page instead.

**Load failures.** A list never says "nothing here" when its load failed. Besides an error status
(P1-CLIENTS-006/3), a load can fail after a 200: the body is not the shape the list reads. The
reference found two (issue #611 there). A list that receives one shows the error state with
"Try again", never the empty state:

- the clients list answers a page envelope (`totalFilteredRecords`, `pageItems`). An empty body
  is still an empty list, as before; any other body without a `pageItems` array is a failure;
- the offices and staff lists answer an array. An empty body is an empty list; any other
  non-array body is a failure.

**Out of scope:** page-size choice, sorting, and lists of later phases (each list adopts these
rules as it is built).

## Mock data

`e2e/web/mocks/clients.ts`: `manyClients(54)` gives "Client 01" to "Client 54" (ids 100 to
153); `GET /clients` honours `displayName`, `offset` and `limit`. New option
`unreadableListOnce`: the next list read answers `200 { unexpected: true }`.
`e2e/web/mocks/organization.ts`: new options `unreadableOfficesOnce` and `unreadableStaffOnce`,
the same for those lists.

## E2E scenarios: paging (P1-SHELL-018)

| ID             | Scenario                                                                                                                                                                                                         | Level       | Status |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-SHELL-018/1 | **Given** 54 clients, **when** Next is pressed twice, **then** the range reads "21–40 of 54", then "41–54 of 54" with Next and Last disabled, each read asking for its offset; Previous returns to "21–40 of 54" | web         | green  |
| P1-SHELL-018/2 | **When** Last is pressed, **then** `offset=40` is read and the range reads "41–54 of 54"; First returns to "1–20 of 54" with First and Previous disabled                                                         | web         | green  |
| P1-SHELL-018/3 | **When** "client" is searched and Next pressed, **then** the read keeps `displayName=client` with `offset=20`; **when** the search becomes "client 5", **then** the list starts again at `offset=0`: "1–5 of 5"  | web         | green  |
| P1-SHELL-018/4 | **When** a client on the second page is opened and Back pressed, **then** the list is on the second page again; opening `/clients?page=9` shows the last page                                                    | web         | green  |
| P1-SHELL-018/5 | **Against** the docker stack, 21 clients sharing a new surname are searched for; the first page shows 20, Next shows the 21st, "21–21 of 21"                                                                     | web-backend | green  |

## E2E scenarios: load failures (P1-SHELL-017)

| ID             | Scenario                                                                                                                                                  | Level | Status |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-SHELL-017/1 | **When** the clients list answers 200 with a body that is not a page, **then** the error state is shown, not "No clients"; Try again lists the clients    | web   | green  |
| P1-SHELL-017/2 | **When** the offices list answers 200 with a body that is not a list, **then** the error state is shown, not the empty state; Try again lists the offices | web   | green  |
| P1-SHELL-017/3 | **When** the staff list answers 200 with a body that is not a list, **then** the error state is shown, not the empty state; Try again lists the staff     | web   | green  |

## Unit and component cases

- **`HttpClientApi.list`**: an empty body is an empty page; a body without a `pageItems` array
  throws a mapping error rather than answering an empty page.
- **`HttpOfficeApi.list`, `HttpStaffApi.list`**: an empty body is an empty list; a non-array body
  throws the same mapping error, rather than a `TypeError` from `.map`.
- **`readListParams`, `toListParams`, `lastPage`** (URL ↔ paging): read `page` and `q`, treat a
  page that is not a whole number of at least 1 as the first, and drop defaults (page 1, no
  search) from the URL.
- **Components** (`ClientsListScreen`): First and Last disable at the ends; a page past the end
  is replaced by the last page.

## Status notes

- **Specified first:** P1-SHELL-018/3 already passed when written: the list kept the search
  across pages and reset the page on a new search. P1-SHELL-017/2 and /3 already passed too: a
  non-array body made `.map` throw, which the list showed as an error. They stay as regression
  cover, and the mappers now fail with a message that names the endpoint. The other web
  scenarios started red and turned green with the implementation.
- **Against the stack:** P1-SHELL-018/5 was not run locally (the docker stack could not run beside
  other work on the machine); the CI backend job runs it.
