# P1-06: Client lifecycle

## Scope

The commands that move a client between statuses, from the client's page: reject, withdraw, undo
a rejection or a withdrawal, close and reactivate. Activate (P1-05) joins the same panel.
Behaviour follows fineract-backoffice-ui's `client-view` and `client-action-dialog` (Apache-2.0).
The web-app's `clients/lifecycle/*` and `close-client` specs are a behaviour reference only
(MPL-2.0: nothing copied).

**Which actions a client offers** depends on its status (`status.code`, never the localized
`status.value`) and on the user's permissions:

| Status                       | Actions                    | Permission each needs                                 |
| ---------------------------- | -------------------------- | ----------------------------------------------------- |
| Pending                      | Activate, Reject, Withdraw | `ACTIVATE_CLIENT`, `REJECT_CLIENT`, `WITHDRAW_CLIENT` |
| Active                       | Close                      | `CLOSE_CLIENT`                                        |
| Closed                       | Reactivate                 | `REACTIVATE_CLIENT`                                   |
| Rejected                     | Undo rejection             | `UNDOREJECT_CLIENT`                                   |
| Withdrawn                    | Undo withdrawal            | `UNDOWITHDRAWAL_CLIENT`                               |
| Transfer in progress/on hold | none (transfers are P1-08) |                                                       |

**The panel.** Choosing an action opens one panel under the details, with:

- the action's **date** (default today, a real `YYYY-MM-DD` date);
- for reject, withdraw and close, a required **reason**, loaded from
  `GET /clients/template?commandParam=reject|withdraw|close` (`narrations`). That endpoint needs
  only `READ_CLIENT`; the reference read the code tables instead, which needs `READ_CODE` too.
  With no reasons set up, the panel says so and names the code an administrator fills
  (`ClientRejectReason`, `ClientWithdrawReason`, `ClientClosureReason`): the server requires a
  reason, so the action cannot be confirmed;
- **Confirm**, disabled until the date (and the reason) are valid, and **Cancel**, which closes
  the panel without a request.

**The command.** `POST /clients/<id>?command=<command>` with ISO dates, `dateFormat: yyyy-MM-dd`
and `locale: en`:

| Action          | `command`        | Body                                   |
| --------------- | ---------------- | -------------------------------------- |
| Activate        | `activate`       | `activationDate`                       |
| Reject          | `reject`         | `rejectionDate`, `rejectionReasonId`   |
| Withdraw        | `withdraw`       | `withdrawalDate`, `withdrawalReasonId` |
| Close           | `close`          | `closureDate`, `closureReasonId`       |
| Reactivate      | `reactivate`     | `reactivationDate`                     |
| Undo rejection  | `undoRejection`  | `reopenedDate`                         |
| Undo withdrawal | `undoWithdrawal` | `reopenedDate`                         |

Two reference defects are not carried over: it sent `closedOnDate` for close, which the server
does not read (its parameter is `closureDate`), and it first sent `undoReject`/`undoWithdraw`,
which the server refuses as unknown commands (its issue #273).

**After the command** the page shows the new status and that status's actions. A closed client
shows its closure date (`timeline.closedOnDate`). A refusal (a date the server will not take, a
client closed with open loans, a client whose status changed elsewhere) is shown in the panel,
which keeps what was entered; the client is reloaded, so the page shows its real status.

**Out of scope:** notes on a command, transfers (P1-08), and the illegal-transition matrix's
server-side checks, which the server owns: this app's part is to offer only legal actions and to
show the server's refusal.

## Mock data

`e2e/web/mocks/clients.ts` gains:

- **`LIFECYCLE_CLIENTS`:** `4 Mary Shelley` (rejected), `5 Alan Turing` (closed on 2026-09-30),
  `6 Emmy Noether` (withdrawn), `7 Kurt Godel` (transfer in progress). The lifecycle spec passes
  them with `CLIENTS`; other specs keep the three clients they had.
- **Commands** follow the server's state machine: an action from a status that does not allow it
  answers 403 with the server's domain-rule body, so a spec cannot pass by sending the wrong
  command.
- **Reasons:** `GET /clients/template?commandParam=…` answers two reasons per action
  (`noReasons` answers none, as the community sandbox does).
- **`refuseCommand`:** the next command answers the given refusal (close with open loans).
- **`changedElsewhere`:** the server's status for a client differs from what the page loaded, as
  when another user acted first.

**Personas** added: `clientAdmin` gains `REJECT_CLIENT`, `WITHDRAW_CLIENT`, `CLOSE_CLIENT`,
`REACTIVATE_CLIENT`, `UNDOREJECT_CLIENT` and `UNDOWITHDRAWAL_CLIENT`; `clientRejecter` has
`READ_CLIENT` and `REJECT_CLIENT` only.

## E2E scenarios: available actions and refusals (P1-CLIENTS-012)

| ID               | Scenario                                                                                                                                                                                                                        | Level | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-CLIENTS-012/1 | **Given** `clientAdmin`, **then** each status offers exactly its actions: pending Activate, Reject and Withdraw; active Close; closed Reactivate; rejected Undo rejection; withdrawn Undo withdrawal; transfer in progress none | web   | green  |
| P1-CLIENTS-012/2 | **Given** `clientRejecter`, **then** a pending client offers Reject only, and an active one nothing; **given** `clerk`, nothing at all                                                                                          | web   | green  |
| P1-CLIENTS-012/3 | **When** the client was activated elsewhere and Reject is confirmed, **then** the server's refusal is shown in the panel, and the page reloads to show the client as Active with Close offered                                  | web   | green  |

## E2E scenarios: reactivate (P1-CLIENTS-013)

| ID               | Scenario                                                                                                                                                                                                | Level | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-CLIENTS-013/1 | **Given** a closed client, **when** Reactivate is confirmed with the default date, **then** `POST /clients/5?command=reactivate` carries `reactivationDate`; the page shows Pending and offers Activate | web   | green  |

## E2E scenarios: reject (P1-CLIENTS-014)

| ID               | Scenario                                                                                                                                                                                                                                                                                                                               | Level       | Status |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-CLIENTS-014/1 | **Given** a pending client, **when** Reject is chosen, **then** the reasons come from `GET /clients/template?commandParam=reject` and Confirm is disabled until one is chosen; **when** confirmed, `POST /clients/3?command=reject` carries `rejectionDate` and `rejectionReasonId`; the page shows Rejected and offers Undo rejection | web         | green  |
| P1-CLIENTS-014/2 | **When** no rejection reasons are set up, **then** the panel says so and names `ClientRejectReason`, and Confirm stays disabled                                                                                                                                                                                                        | web         | green  |
| P1-CLIENTS-014/3 | **Against** the docker stack, a pending client is rejected with a seeded reason and opens as Rejected                                                                                                                                                                                                                                  | web-backend | green  |

## E2E scenarios: undo rejection (P1-CLIENTS-015)

| ID               | Scenario                                                                                                                                                                                                    | Level | Status |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-CLIENTS-015/1 | **Given** a rejected client, **when** Undo rejection is confirmed, **then** `POST /clients/4?command=undoRejection` carries `reopenedDate`; the page shows Pending and offers Activate, Reject and Withdraw | web   | green  |

## E2E scenarios: withdraw (P1-CLIENTS-016)

| ID               | Scenario                                                                                                                                                                                                                     | Level | Status |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| P1-CLIENTS-016/1 | **Given** a pending client, **when** Withdraw is confirmed with a reason, **then** `POST /clients/3?command=withdraw` carries `withdrawalDate` and `withdrawalReasonId`; the page shows Withdrawn and offers Undo withdrawal | web   | green  |
| P1-CLIENTS-016/2 | **Given** a withdrawn client, **when** Undo withdrawal is confirmed, **then** `POST /clients/6?command=undoWithdrawal` carries `reopenedDate`, and the page shows Pending                                                    | web   | green  |

## E2E scenarios: close (P1-CLIENTS-017)

| ID               | Scenario                                                                                                                                                                                                                                                    | Level          | Status |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| P1-CLIENTS-017/1 | **Given** an active client, **when** Close is confirmed with a date and a reason, **then** `POST /clients/1?command=close` carries `closureDate` (not `closedOnDate`) and `closureReasonId`; the page shows Closed, the closure date, and offers Reactivate | web            | green  |
| P1-CLIENTS-017/2 | **While** the date is not a real date or no reason is chosen, **then** Confirm is disabled and the date says why                                                                                                                                            | web            | green  |
| P1-CLIENTS-017/3 | **When** Cancel is pressed, **then** the panel closes, no command is sent and the client stays Active                                                                                                                                                       | web            | green  |
| P1-CLIENTS-017/4 | **When** the server refuses because the client has open loans, **then** its message is shown in the panel, the chosen reason and date stay, and the client stays Active                                                                                     | web            | green  |
| P1-CLIENTS-017/5 | **Against** the docker stack, an active client is closed with a seeded reason, then reactivated, and opens as Pending                                                                                                                                       | web-backend    | red    |
| P1-CLIENTS-017/6 | **On a device**, an active client is closed and reactivated from its page                                                                                                                                                                                   | native-backend | red    |

## Unit and component cases

- **`HttpClientApi`**:
  - `command()` posts `?command=` with the body fields of the table above, ISO dates,
    `dateFormat` and `locale`, and a reason only for reject, withdraw and close;
  - `reasons()` reads `narrations` from the template for its command (captured from the
    community sandbox: empty) and answers `{ id, name }`, dropping inactive values;
  - `mapClient` reads `timeline.closedOnDate`.
- **`clientActions(status)`**: the table of actions per status; an unknown status offers none.
- **Components** (`ClientView`): actions follow status and permission; the panel's Confirm
  enables on a valid date and, where needed, a reason; no reasons shows the code to fill;
  Cancel sends nothing; a refusal stays in the panel and reloads the client.

## Status notes

- **Specified first**, then implemented: every scenario started red. The web scenarios are
  green, and P1-CLIENTS-014/3 turned green when the nightly pending probe of 2026-10-17 reported
  it passing against the docker stack. P1-CLIENTS-017/5 (docker stack) and P1-CLIENTS-017/6 (a
  device) stay red.
- **A race the stack found:** P1-CLIENTS-017/5 was flaky in that probe. The reload after a command
  lands before the command settles, so the next status's buttons appeared while the panel was
  still busy: Reactivate, pressed then, opened a panel the settling Close then shut. The buttons
  are now disabled while a command runs, and a command closes only its own panel.
- **Activate** keeps its P1-05 scenarios (P1-CLIENTS-011); its control moves into the shared
  panel, so its test ids become `client.action.activate`, `client.action-date` and
  `client.action-confirm`.
- **Reasons** could not be captured with values: the community sandbox has none set up for any
  of the three codes (2026-10-17), which is why the no-reasons case is a scenario. The value shape
  (`id`, `name`, `position`, `active`, `mandatory`) is the server's `CodeValueData`.
