# P1-05: Clients

## Scope

The clients list, a client's page, creating a client and activating a pending one. Behaviour
follows fineract-backoffice-ui's `features/clients` (Apache-2.0) and its e2e specs `client`,
`client-legal-form-search` and `client-load-error`. The web-app's `create-client` and
`create-client-form-validation` specs are a behaviour reference only (MPL-2.0: nothing copied).

**List** (`/clients`, `READ_CLIENT`):

- `GET /clients` with `offset`, `limit=20` and `orderBy=displayName`. Paging is on the server:
  Previous / Next and "1–20 of 45" from `totalFilteredRecords`.
- **No `legalForm` filter.** The reference's list sent `legalForm=1` on one of its paths, which hid
  entity clients (its issue #534); people and entities are listed together.
- The search box asks the server (`displayName`), after a short pause in typing, and returns to
  the first page.
- Each row: display name, account number, office and status. Status is read from `status.code`
  (`clientStatusType.active`), never from the localized `status.value`.

**View** (`/clients/<id>`, `READ_CLIENT`): display name, account number, status, office, legal
form (Person / Entity), external id, mobile number, email, submitted-on date and activation date.
A client that does not exist says so and links back to the list; any other failure offers to try
again.

**Create** (`/clients/new`, `CREATE_CLIENT`). One form rather than the reference's three-step
wizard, which does not suit a phone:

- **Legal form:** Person (default) or Entity. A person has first, middle and last names; an
  entity has one name (`fullname`). Switching swaps the fields; only the chosen form's names are
  sent.
- **Office** (required), **submitted on** (defaults to today), **active** (default on) and,
  while active, **activation date** (defaults to today).
- **External id, mobile number, email:** optional.
- Rules: names required (trimmed); mobile digits only; email shape; dates real `YYYY-MM-DD`.
  "Save" stays disabled while anything is invalid, and the field says why.
- `POST /clients` sends ISO dates with `dateFormat: yyyy-MM-dd` and `locale: en`, omits blank
  optional fields, and sends `activationDate` only for an active client. The new client's page
  opens (the reference returned to the list).
- A server validation error naming a parameter is shown under that field; anything else above the
  form. The form keeps what was typed.

**Activate** (`ACTIVATE_CLIENT`): a pending client's page offers Activate, which asks for the
activation date (default today) and sends `POST /clients/<id>?command=activate`. The page then
shows the client as active.

**Out of scope:** editing, the other lifecycle commands (reject, withdraw, close, reactivate,
undo), transfers, staff assignment, accounts, KYC, documents, charges, collateral and notes. They
are later slices of the same parity rows.

## Mock data

`e2e/web/mocks/clients.ts`, a small stateful backend:

- **Clients:** `1 Ada Lovelace` (person, active, Head Office, account `000000001`), `2 Acme
Traders Ltd` (entity, active, Kampala Branch), `3 Grace Hopper` (person, pending).
- **`manyClients(n)`:** `n` generated clients for the paging scenario.
- `GET /clients` honours `displayName` (substring, case-insensitive), `offset` and `limit`, and
  answers `{ totalFilteredRecords, pageItems }`. Dates are `[y, m, d]`, as the server sends them.

`signInAs` answers `GET /clients` with an empty page by default, so specs that only need the
clients screen to render (the shell and RBAC specs) do not each mock it.

**Personas** added: `clientAdmin` (`READ_CLIENT`, `CREATE_CLIENT`, `ACTIVATE_CLIENT`,
`READ_OFFICE`). The existing `clerk` (`READ_CLIENT`) is the reader.

## E2E scenarios: list (P1-CLIENTS-003)

| ID               | Scenario                                                                                                                                                                                      | Level          | Status |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| P1-CLIENTS-003/1 | **Given** three clients, **then** the list requests `offset=0`, `limit=20` and no `legalForm`, and shows each with account number, office and status; the entity is listed with the people    | web            | green  |
| P1-CLIENTS-003/2 | **When** "ada" is typed in the search box, **then** the list is requested with `displayName=ada` and only Ada Lovelace remains; **when** "zzz" is typed, **then** a no-match message is shown | web            | green  |
| P1-CLIENTS-003/3 | **Given** 25 clients, **then** the first page shows 20 and "1–20 of 25"; Next requests `offset=20` and shows 5 with Next disabled; Previous returns to the first page                         | web            | green  |
| P1-CLIENTS-003/4 | **Given** `clerk`, **then** there is no "New client" control; a row opens that client's page                                                                                                  | web            | green  |
| P1-CLIENTS-003/5 | **The view** shows name, account number, status, office, legal form, external id, mobile, email, submitted-on and activation dates (from `[y, m, d]`)                                         | web            | green  |
| P1-CLIENTS-003/6 | **On a device**, the clients list opens from the drawer and a client's page opens from the list                                                                                               | native-backend | green  |

## E2E scenarios: legal forms (P1-CLIENTS-005)

| ID               | Scenario                                                                                                                       | Level       | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------ |
| P1-CLIENTS-005/1 | **Against** the docker stack, an entity client created through the API is found in the list by its name, with its page opening | web-backend | green  |

## E2E scenarios: load errors (P1-CLIENTS-006)

| ID               | Scenario                                                                                                                       | Level | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----- | ------ |
| P1-CLIENTS-006/1 | **When** a client id does not exist (404), **then** the page says so and links back to the list                                | web   | green  |
| P1-CLIENTS-006/2 | **When** a client fails to load (500), **then** an error with "Try again" is shown, and trying again after recovery shows them | web   | green  |
| P1-CLIENTS-006/3 | **When** the list fails to load (500), **then** an error with "Try again" is shown, and trying again after recovery lists them | web   | green  |

## E2E scenarios: create (P1-CLIENTS-009)

| ID               | Scenario                                                                                                                                                                                                                                        | Level       | Status |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-CLIENTS-009/1 | **Given** `clientAdmin`, **when** a person is created with office, names and the default dates, **then** `POST /clients` carries `legalFormId: 1`, the names, ISO dates, `active`, `dateFormat`, `locale` and no blank optional; the page opens | web         | green  |
| P1-CLIENTS-009/2 | **When** Entity is chosen, **then** the name fields become one "Name" field, and `POST /clients` carries `legalFormId: 2` and `fullname`, and no `firstname` or `lastname`                                                                      | web         | green  |
| P1-CLIENTS-009/3 | **When** Active is unchecked, **then** the activation date is hidden, `POST /clients` carries `active: false` and no `activationDate`, and the new client's page shows Pending                                                                  | web         | green  |
| P1-CLIENTS-009/4 | **When** the server answers 400 naming `externalId`, **then** the message is shown under the external id field and the typed values stay                                                                                                        | web         | green  |
| P1-CLIENTS-009/5 | **Given** `clerk`, **then** `/clients/new` by URL shows Access Denied naming `CREATE_CLIENT`                                                                                                                                                    | web         | green  |
| P1-CLIENTS-009/6 | **Against** the docker stack, a person created through the form opens as Active and is found in the list                                                                                                                                        | web-backend | green  |

## E2E scenarios: create validation (P1-CLIENTS-010)

| ID               | Scenario                                                                                                                                                                          | Level | Status |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-CLIENTS-010/1 | **While** the office or a required name is missing, **then** "Save" is disabled; it enables once they are given, for a person (first and last name) and for an entity (name)      | web   | green  |
| P1-CLIENTS-010/2 | **When** the mobile number has non-digits, the email is malformed or a date is not a real `YYYY-MM-DD` date, **then** the field says why and "Save" is disabled until it is fixed | web   | green  |

## E2E scenarios: activate (P1-CLIENTS-011)

| ID               | Scenario                                                                                                                                                                                        | Level | Status |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-CLIENTS-011/1 | **Given** `clientAdmin` and a pending client, **when** Activate is confirmed with the default date, **then** `POST /clients/3?command=activate` carries the ISO date, and the page shows Active | web   | green  |
| P1-CLIENTS-011/2 | **Then** Activate is not offered for an active client, nor to `clerk` for a pending one                                                                                                         | web   | green  |

## Unit and component cases

- **`HttpClientApi` / `mapClient`**:
  - maps id, account number, names, display name, legal form (`legalForm.id` 1 / 2), office,
    status code, contact fields and the dates (`activationDate`, `timeline.submittedOnDate`) from
    `[y, m, d]`;
  - fails loudly on a client with no id;
  - `list()` sends `offset`, `limit`, `orderBy` and `displayName` only when given, never
    `legalForm`, and answers `{ total, items }`;
  - `create()` sends a person's or an entity's names only, ISO dates with `dateFormat`/`locale`,
    `activationDate` only when active, and omits blanks; answers the new id;
  - `activate()` posts `command=activate` with the date.
- **`clientStatus(code)`**: `clientStatusType.pending|active|closed|rejected|withdrawn|…` → a known
  status, anything else → `unknown` (shown as the raw value).
- **Form schema** (`client-form.ts`): required names per legal form; office required; real dates;
  digits-only mobile; email shape; the draft drops the other legal form's names and the activation
  date of an inactive client.
- **`useDebouncedValue`**: the value settles after the delay; a newer value restarts it.
- **Components** (`ClientsList`, `ClientForm`, `ClientView`): the create and activate controls
  follow permission and status; paging buttons enable by position; the form swaps name fields.

## Status notes

- **Specified first**, then implemented: every scenario started red except P1-CLIENTS-009/5, which
  route protection (P1-02) already satisfied (`/clients/new` was declared `CREATE_CLIENT` there).
- **Against the docker stack:** P1-CLIENTS-005/1 and P1-CLIENTS-009/6 started red (`backend`
  project) and turned green when the nightly pending probe of 2026-10-17 reported them passing.
  P1-CLIENTS-003/6 runs on every PR in the Android e2e job (an emulator signed in to the docker stack), on a client it seeds.
- **Shell and RBAC specs** that used `/clients` as their example of an admitted module now expect
  the clients screens; P1-SHELL-027/3 takes Notifications as its still-placeholder module.
- **Captured shapes:** the mapper tests run on `GET /clients` and `GET /clients/{id}` payloads
  captured from the community sandbox (`src/testing/fixtures/backend/README.md`). They showed that
  list rows carry `legalForm` and `timeline` too, and that `status` sends `value`, not the
  declared `description`.
