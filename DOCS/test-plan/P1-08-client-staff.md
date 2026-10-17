# P1-08: Client staff assignment

## Scope

The member of staff (loan officer) a client is assigned to: shown on the client's page, assigned
and unassigned from it. Behaviour follows fineract-backoffice-ui's `client-view` and
`client-staff-dialog` and its e2e spec `client-servicing-gaps` ("Client staff and default savings
account", Apache-2.0). Transfers and the default savings account are later slices of the same
parity row (P1-CLIENTS-007); the savings account needs savings accounts, which are Phase 4.

**On the client's page**, a "Loan officer" row shows the assigned member of staff
(`staffName`), when there is one.

**Assign** (`ASSIGNSTAFF_CLIENT`), offered while the client is pending or active (a rejected,
withdrawn or closed client is not serviced):

- the choices come from `GET /clients/template?officeId=<the client's office>`
  (`staffOptions`), deliberately **without** `staffInSelectedOfficeOnly`: that flag keeps only
  staff whose own office is the client's, which empties the list for a branch with no staff of
  its own, though the server assigns a head-office member to a branch client;
- Confirm is disabled until a member is chosen; with no staff to choose, the panel says so;
- `POST /clients/<id>?command=assignStaff` sends `{ staffId }`; the page then shows the officer.

**Unassign** (`UNASSIGNSTAFF_CLIENT`), offered only while someone is assigned: confirmed in place,
then `POST /clients/<id>?command=unassignStaff` with the current `{ staffId }`. The server
requires it ("The parameter `staffId` is mandatory"), so the holder is echoed back.

A refusal is shown in place and the client is reloaded, as for the lifecycle commands (P1-06).

**Out of scope:** the default savings account, transfers, and staff in group or loan contexts.

## Mock data

`e2e/web/mocks/clients.ts`:

- **Ada Lovelace (1)** is assigned `1 Director, Program`; Grace Hopper (3) and Acme (2) have no
  one.
- `GET /clients/template?officeId=…` answers `STAFF_OPTIONS`: `1 Director, Program` and
  `4 Officer, Probe` (`noStaff` answers none).
- `assignStaff` and `unassignStaff` change the client's `staffId` and `staffName`; unassigning
  without the current `staffId` is refused as the server refuses it.

**Personas** added: `staffAssigner` (`READ_CLIENT`, `ASSIGNSTAFF_CLIENT`, `UNASSIGNSTAFF_CLIENT`).

## E2E scenarios: staff assignment (P1-CLIENTS-007)

| ID               | Scenario                                                                                                                                                                                                                                                             | Level       | Status |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-CLIENTS-007/1 | **Given** `staffAssigner`, **then** Ada's page shows her loan officer "Director, Program"; Grace's shows none                                                                                                                                                        | web         | green  |
| P1-CLIENTS-007/2 | **When** Assign staff is chosen for Grace, **then** the choices come from `GET /clients/template?officeId=1` without `staffInSelectedOfficeOnly`, Confirm is disabled until one is chosen, `assignStaff` sends `{ staffId: 4 }`, and the page shows "Officer, Probe" | web         | green  |
| P1-CLIENTS-007/3 | **When** Ada's officer is unassigned and confirmed, **then** `unassignStaff` sends the current `{ staffId: 1 }` and the officer is gone; Cancel sends nothing                                                                                                        | web         | green  |
| P1-CLIENTS-007/4 | **When** the office has no staff, **then** the assign panel says so and Confirm stays disabled                                                                                                                                                                       | web         | green  |
| P1-CLIENTS-007/5 | **Then** Unassign is not offered when no one is assigned; neither is offered to `clerk`, nor for a closed client                                                                                                                                                     | web         | green  |
| P1-CLIENTS-007/6 | **Against** the docker stack, a member of staff created through the API is assigned to a new client and shown on its page                                                                                                                                            | web-backend | green  |
| P1-CLIENTS-007/7 | **Against** the docker stack, an officer assigned through the API is unassigned from the page and no longer shown                                                                                                                                                    | web-backend | green  |

## Unit and component cases

- **`HttpClientApi`**: `mapClient` reads `staffId` and `staffName` (absent → `null`);
  `staffOptions(officeId)` reads `staffOptions` and asks without `staffInSelectedOfficeOnly`;
  `assignStaff` / `unassignStaff` post their command with `{ staffId }`.
- **Components** (`ClientView`): assign and unassign follow permission, status and whether
  someone is assigned; Confirm waits for a choice; unassign is confirmed in place.

## Status notes

- **Specified first**, then implemented: every scenario started red. The web scenarios are
  green, and P1-CLIENTS-007/6 turned green when the nightly pending probe of 2026-10-17 reported
  it passing against the docker stack.
- **Captured shapes:** the community sandbox has no staff (2026-10-17), so its template has no
  `staffOptions`. They were captured from the e2e stack (`stack.client.template.office.json`):
  each is the server's `StaffData`, with `joiningDate` as `[y, m, d]` here, though `GET /staff`
  sends a string. Only `id` and `displayName` are read.
