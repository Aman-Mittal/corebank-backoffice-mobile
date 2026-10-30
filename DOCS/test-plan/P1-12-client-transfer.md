# P1-12: Client transfer between offices

## Scope

Moving a client from one office to another, from the client's page. Behaviour follows
fineract-backoffice-ui's `client-view`, `client-transfer-dialog` and
`client-transfer-response-dialog`, and its e2e spec `client-transfer` (Apache-2.0).

A transfer is either proposed and then answered, or done in one step:

- **Propose** (`PROPOSETRANSFER_CLIENT`), offered while the client is active. The client stays at
  its office with the status "Transfer in progress" until the transfer is answered.
- **Transfer now** (`PROPOSEANDACCEPTTRANSFER_CLIENT`), offered while the client is active, for a
  user who may act for both offices: the client moves at once and stays active.
- **Accept** (`ACCEPTTRANSFER_CLIENT`) and **Reject** (`REJECTTRANSFER_CLIENT`), offered while a
  transfer is in progress. Accepting moves the client to the destination office and makes it
  active again. Rejecting leaves the client at its office with the status "Transfer on hold".
- **Withdraw** (`WITHDRAWTRANSFER_CLIENT`), offered while a transfer is in progress or on hold. It is
  the only way back to active from on hold: the server refuses Accept there ("is not awaiting
  transfer").

**On the client's page**, a client with a transfer in progress shows a "Transferring to" row with
the destination office (`transferToOfficeName`).

**Choosing the office.** The destinations come from `GET /clients/template` (`officeOptions`), which
needs only `READ_CLIENT`, without the client's own office: the server refuses a transfer to the
office a client is already in. Confirm is disabled until an office is chosen.

**What each command sends** (`POST /clients/<id>?command=…`), as the server accepts it:

- `proposeTransfer`: `destinationOfficeId` and `transferDate` (ISO, starting at today) with the
  date format and locale, and `note` when one is typed;
- `proposeAndAcceptTransfer`: `destinationOfficeId`, and `note` when typed. The server refuses a
  `transferDate` here ("The parameter transferDate is not supported"), so none is sent;
- `acceptTransfer`, `rejectTransfer`, `withdrawTransfer`: only `note` when typed. Each is confirmed
  in place first, with an optional note; Cancel sends nothing.

After each command the client is reloaded, so the page shows the server's status and office. A
refusal is shown in place, and the client is reloaded as for the lifecycle commands (P1-06).

**Out of scope:** the transfer history, transfers of groups, and transferring a client's accounts
(the server moves them with the client).

## Mock data

`e2e/web/mocks/clients.ts`:

- `GET /clients/template` with no query answers `officeOptions`: Head Office (1), Kampala Branch
  (2), Entebbe Sub-branch (3).
- **Kurt Godel (7)** has a transfer in progress from Head Office to Kampala Branch
  (`transferToOfficeId: 2`).
- The transfer commands follow the server's state machine: propose moves an active client to
  "Transfer in progress"; accept moves it to the destination office and makes it active; reject
  puts it on hold; withdraw makes it active at its office; propose-and-accept moves an active
  client at once and refuses a `transferDate` as the server does. A transfer to the client's own
  office, and an accept that is not awaited, are refused in the server's shapes.

**Personas** added: `transferAdmin` (`READ_CLIENT` and the five transfer permissions),
`transferProposer` (`READ_CLIENT`, `PROPOSETRANSFER_CLIENT`).

## E2E scenarios: client transfer (P1-CLIENTS-008)

| ID               | Scenario                                                                                                                                                                                                                                                                                                                                                                                                                                | Level                       | Status |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| P1-CLIENTS-008/1 | **Given** `transferAdmin` on active Ada (Head Office), **when** Propose transfer is chosen, **then** the offices offered are Kampala Branch and Entebbe Sub-branch, the date starts at today and Confirm waits for an office; `proposeTransfer` sends `destinationOfficeId: 2`, the date with format and locale, and the typed note; the page then shows "Transfer in progress", "Transferring to Kampala Branch" and still Head Office | web                         | green  |
| P1-CLIENTS-008/2 | **Given** Kurt's transfer in progress, **when** Accept is confirmed, **then** `acceptTransfer` is sent with no body fields, and the page shows Active at Kampala Branch with no transfer row                                                                                                                                                                                                                                            | web                         | green  |
| P1-CLIENTS-008/3 | **When** Kurt's transfer is rejected with a note, **then** `rejectTransfer` sends the note, the page shows "Transfer on hold" at Head Office with Withdraw but no Accept or Reject; **when** Withdraw is confirmed, the client is Active at Head Office                                                                                                                                                                                 | web                         | green  |
| P1-CLIENTS-008/4 | **When** Transfer now is confirmed for Ada with Entebbe Sub-branch, **then** `proposeAndAcceptTransfer` sends only `destinationOfficeId: 3`, and the page shows Active at Entebbe Sub-branch                                                                                                                                                                                                                                            | web                         | green  |
| P1-CLIENTS-008/5 | **Then** Cancel on any transfer panel sends nothing; a refusal is shown in place; `clerk` is offered no transfer action, and `transferProposer` only Propose transfer                                                                                                                                                                                                                                                                   | web                         | green  |
| P1-CLIENTS-008/6 | **Against** the docker stack, a transfer to a new office is proposed from the page, then accepted, and the client is Active at the new office                                                                                                                                                                                                                                                                                           | web-backend                 | green  |
| P1-CLIENTS-008/7 | **Against** the docker stack, a proposed transfer is rejected, leaving the client on hold, then withdrawn, leaving it Active at its office                                                                                                                                                                                                                                                                                              | web-backend                 | green  |
| P1-CLIENTS-008/8 | **Against** the docker stack, Transfer now moves a new client to another office in one step                                                                                                                                                                                                                                                                                                                                             | web-backend, native-backend | green  |

## Unit and component cases

- **`HttpClientApi`**:
  - `mapClient` reads `transferToOfficeId` and `transferToOfficeName` from the captured client
    (`stack.client.transfer-in-progress.json`), and `null` when absent;
  - `transferOffices()` reads `officeOptions` from the template, asking with no query;
  - `transfer('proposeTransfer', …)` sends the destination, the ISO date with format and locale,
    and the note only when given; `proposeAndAcceptTransfer` sends no date; the three answers send
    only a given note.
- **Components** (`ClientTransfer`): the actions follow permission and status; the destination
  excludes the client's office; Confirm waits for an office; a response is confirmed in place;
  a refusal is shown.

## Status notes

- **Specified first**, then implemented: every scenario started red. The web scenarios and the
  three web-backend scenarios passed locally against the docker stack on 2026-10-30; the Android
  flow (P1-CLIENTS-008/8) runs in CI.
- **Captured shapes** (e2e stack, 2026-10-30): the client with a transfer in progress
  (`stack.client.transfer-in-progress.json`), the template's offices
  (`stack.client.template.offices.json`), and the refusals. The server also showed that
  proposing again while a transfer is in progress is accepted silently, and that a transfer date
  before the client's activation is accepted.
