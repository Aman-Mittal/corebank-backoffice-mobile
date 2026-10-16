# P1-04: Offices and staff

## Scope

The first two modules with real screens, under **Organization**. Behaviour follows
fineract-backoffice-ui's `features/organization/offices` and `features/organization/staff`
(Apache-2.0), which have no e2e specs of their own, so these parity rows are new
(`P1-ORG-001`, `P1-ORG-002`).

**Offices** (`/organization/offices`):

- **List.** Every office (`GET /offices?includeAllOffices=true`) in the server's hierarchy order,
  indented by depth, with external id and opening date. A search box filters by name.
- **View** (`/organization/offices/<id>`). Name, parent office (a link to it), opening date,
  external id.
- **Create** (`/organization/offices/new`). Name, parent office (defaults to the head office),
  opening date (defaults to today), external id.
- **Edit** (`/organization/offices/<id>/edit`). Name, opening date, external id. The parent is
  shown but cannot change: `PUT /offices/{id}` does not move an office.

**Staff** (`/organization/staff`):

- **List.** All staff, active and inactive (`GET /staff?status=all`; the server's default hides
  inactive staff), with office, loan-officer flag and status. An office filter narrows the request
  (`officeId`); a search box filters by name.
- **View** (`/organization/staff/<id>`).
- **Create** (`/organization/staff/new`). Office, first and last name, mobile number, email,
  external id, loan officer, active, joining date.
- **Edit** (`/organization/staff/<id>/edit`). First and last name, mobile number, external id,
  loan officer, active. Office and joining date are shown but not sent.

**Permissions**, as in the reference:

| Screen            | Requires        |
| ----------------- | --------------- |
| Office list, view | `READ_OFFICE`   |
| Office create     | `CREATE_OFFICE` |
| Office edit       | `UPDATE_OFFICE` |
| Staff list, view  | `READ_STAFF`    |
| Staff create      | `CREATE_STAFF`  |
| Staff edit        | `UPDATE_STAFF`  |

A control whose screen would refuse the user is not shown (the reference's dead-end-control rule).
The create and edit forms also need the office list for their office pickers.

**Writes**, through the adapters (DOCS/ADAPTERS.md, rule 2): dates are sent as ISO with
`dateFormat: yyyy-MM-dd` and `locale: en`; blank optional fields are omitted, not sent as `""`
(the server rejects `mobileNo: ""`). A server validation error that names a parameter is shown
under that field; anything else is shown above the form. The form keeps what was typed.

**Out of scope:** office transactions, staff-to-office reassignment, bulk import (later phases).

## Mock data

`e2e/web/mocks/organization.ts`:

- **Offices:** `1 Head Office` (`.`), `2 Kampala Branch` (`.2.`, parent 1), `3 Entebbe Sub-branch`
  (`.2.3.`, parent 2), in the `[y, m, d]` date form the server sends.
- **Staff:** `1 Director, Program` (Head Office, loan officer, active), `2 Okello, Grace` (Kampala
  Branch, inactive), with `joiningDate` as a string, as `GET /staff` sends it.

**Personas** added to `e2e/web/mocks/personas.ts`:

| Persona        | Permissions                                                 |
| -------------- | ----------------------------------------------------------- |
| `officeAdmin`  | `READ_OFFICE`, `CREATE_OFFICE`, `UPDATE_OFFICE`             |
| `officeReader` | `READ_OFFICE`                                               |
| `staffAdmin`   | `READ_STAFF`, `CREATE_STAFF`, `UPDATE_STAFF`, `READ_OFFICE` |
| `staffReader`  | `READ_STAFF`                                                |

## E2E scenarios: offices (P1-ORG-001)

| ID            | Scenario                                                                                                                                                                                                                                       | Level          | Status |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| P1-ORG-001/1  | **Given** three offices, **then** the list shows all of them in hierarchy order, each indented by depth, with external id and opening date (`2009-01-01`, from `[2009, 1, 1]`), and requests `includeAllOffices=true`                          | web            | green  |
| P1-ORG-001/2  | **When** "kamp" is typed in the search box, **then** only Kampala Branch remains; **when** "zzz" is typed, **then** an empty-result message is shown                                                                                           | web            | green  |
| P1-ORG-001/3  | **Given** `officeReader`, **then** the list has no "New office" control, and `/organization/offices/new` by URL shows Access Denied naming `CREATE_OFFICE`                                                                                     | web            | green  |
| P1-ORG-001/4  | **Given** `officeAdmin`, **when** a new office is created under Kampala Branch, **then** `POST /offices` carries `name`, `parentId: 2`, `openingDate` (ISO), `dateFormat`, `locale` and no blank `externalId`, and the new office's page opens | web            | green  |
| P1-ORG-001/5  | **While** the name is empty or the opening date is not a real `YYYY-MM-DD` date, **then** "Save" is disabled and the date field explains the format                                                                                            | web            | green  |
| P1-ORG-001/6  | **When** the server answers 400 naming `name` ("already exists"), **then** the message is shown under the name field and the typed values stay                                                                                                 | web            | green  |
| P1-ORG-001/7  | **The view** shows name, parent (a link that opens the parent office), opening date and external id; "Edit" is shown to `officeAdmin` and not to `officeReader`                                                                                | web            | green  |
| P1-ORG-001/8  | **When** an office is edited, **then** the form is prefilled, the parent is read-only, `PUT /offices/2` carries no `parentId`, and the view shows the new name                                                                                 | web            | green  |
| P1-ORG-001/9  | **Given** `officeReader`, **then** `/organization/offices/2/edit` by URL shows Access Denied naming `UPDATE_OFFICE`                                                                                                                            | web            | green  |
| P1-ORG-001/10 | **When** the list fails to load (500), **then** an error with "Try again" is shown, and trying again after recovery shows the offices                                                                                                          | web            | green  |
| P1-ORG-001/11 | **When** an office id does not exist (404), **then** the view says so and links back to the list                                                                                                                                               | web            | green  |
| P1-ORG-001/12 | **Against** the docker stack, an office created through the form appears in the list and its page                                                                                                                                              | web-backend    | red    |
| P1-ORG-001/13 | **On a device**, the offices list opens from the drawer and an office's page opens from the list                                                                                                                                               | native-backend | red    |

## E2E scenarios: staff (P1-ORG-002)

| ID            | Scenario                                                                                                                                                                                                                                                                 | Level          | Status |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------ |
| P1-ORG-002/1  | **Given** two staff, **then** the list requests `status=all` and shows both with office, a loan-officer mark and an Active / Inactive status                                                                                                                             | web            | green  |
| P1-ORG-002/2  | **When** Kampala Branch is chosen in the office filter, **then** the list is requested again with `officeId=2`; **when** a name is searched, **then** only matching staff remain                                                                                         | web            | green  |
| P1-ORG-002/3  | **Given** `staffReader`, **then** there is no "New staff" control, and `/organization/staff/new` by URL shows Access Denied naming `CREATE_STAFF`                                                                                                                        | web            | green  |
| P1-ORG-002/4  | **Given** `staffAdmin`, **when** staff is created with only office, names and joining date, **then** `POST /staff` carries those, `isActive`, `isLoanOfficer`, `dateFormat`, `locale`, and no blank `mobileNo`, `emailAddress` or `externalId`; the new staff page opens | web            | green  |
| P1-ORG-002/5  | **While** a name is empty, the mobile number has non-digits, the email is malformed or the joining date is not a real date, **then** "Save" is disabled and the field says why                                                                                           | web            | green  |
| P1-ORG-002/6  | **When** the server answers 400 naming `mobileNo`, **then** the message is shown under the mobile field                                                                                                                                                                  | web            | green  |
| P1-ORG-002/7  | **The view** shows name, office, mobile, email, external id, joining date, loan officer and status; "Edit" is shown to `staffAdmin` and not to `staffReader`                                                                                                             | web            | green  |
| P1-ORG-002/8  | **When** staff is edited, **then** the form is prefilled, office and joining date are read-only, `PUT /staff/2` carries the editable fields and no `joiningDate` or `officeId`, and the view shows the change                                                            | web            | green  |
| P1-ORG-002/9  | **Given** `staffReader`, **then** `/organization/staff/2/edit` by URL shows Access Denied naming `UPDATE_STAFF`                                                                                                                                                          | web            | green  |
| P1-ORG-002/10 | **Given** no staff, **then** the list says there are none yet                                                                                                                                                                                                            | web            | green  |
| P1-ORG-002/11 | **Against** the docker stack, staff created in the head office appears in the list with status Active                                                                                                                                                                    | web-backend    | red    |
| P1-ORG-002/12 | **On a device**, the staff list opens from the drawer and a staff member's page opens from the list                                                                                                                                                                      | native-backend | red    |

## Unit and component cases

- **`HttpStaffApi` / `mapStaff`** (captured shape, `src/testing/fixtures/backend/staff.list.json`):
  - maps names, display name (falling back to `Lastname, Firstname`), office, flags, and a
    `joiningDate` sent as either a string or `[y, m, d]`;
  - fails loudly on a staff member with no id;
  - `list()` passes `status`, `officeId` and `loanOfficersOnly` only when given, and treats an
    empty body as `[]`;
  - `create()` sends dates with `dateFormat`/`locale`, omits blank optional fields, and answers
    the new id;
  - `update()` sends only the editable fields, omitting blanks.
- **`HttpOfficeApi`** (already tested): unchanged.
- **Form schemas** (`office-form.ts`, `staff-form.ts`):
  - a real calendar date is required (`2026-02-30` is refused);
  - names are trimmed and required; mobile digits only; email shape;
  - the draft a schema produces is what the adapter expects (blank optionals become `null`).
- **`formFailure(error, fields, fallback)`**: an `AppError` with field messages maps onto known
  form fields; unknown fields and field-less messages go to the form-level error.
- **`depthOf(hierarchy)`**: depth from `hierarchy` (`.` → 0, `.2.` → 1, `.2.3.` → 2).
- **Components** (`OfficesList`, `OfficeForm`, `StaffList`, `StaffForm`): the create control
  follows the permission; search filters; the forms submit the draft and show server field errors.
- **`SelectField`**: shows the chosen option, lists options as a radio group with
  `aria-checked` (React Native has no `listbox` role), and reports the choice; disabled, it shows
  the value and does not open.

## Status notes

- **Red, because they need what this machine cannot run alongside everything else:**
  P1-ORG-001/12 and P1-ORG-002/11 need the docker stack (`backend` project); P1-ORG-001/13 and
  P1-ORG-002/12 need a device.
- **Found while making the specs pass:** on web the navigation stack keeps earlier screens mounted
  (hidden), so following a parent office leaves two office pages in the DOM. The page objects
  select the visible one, and saving an edit returns to the record's existing page
  (`router.dismissTo`) rather than stacking a second copy, so Back does not reopen the form.
- **Not captured:** the public sandbox had no staff on 2026-10-16, so the staff fixture follows the
  shape fineract-backoffice-ui recorded from a running instance. Re-capture it from the e2e stack.
