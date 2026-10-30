# P1-11: Client charges

## Scope

Fees and penalties charged to a client directly, not through a loan or savings account: listed on
their own screen under the client's page, added, paid, waived and deleted. Behaviour follows
fineract-backoffice-ui's `clients/charges` (Apache-2.0). The web-app's `charges/add-charge` and
`charges/charge-operations` specs are a behaviour reference only (MPL-2.0: nothing copied).

**On the client's page**, "Charges" opens `/clients/<id>/charges`. The link is shown only to a
user who may read client charges (`READ_CLIENTCHARGE`).

**The list** (`GET /clients/<id>/charges`, every page item, in the server's order: latest due date
first). Each row shows:

- the charge's name, marked "Penalty" for a penalty;
- the due date;
- the amount, the amount paid, the amount waived and the amount outstanding, each in the charge's
  currency with that currency's decimal places;
- a status read from the flags, never from a label: Paid (`isPaid`), Waived (`isWaived`), else
  Outstanding.

**Add** (`CREATE_CLIENTCHARGE`), offered only while the client is active (the server refuses
others: "The Client with id … is not active"):

- the charges to choose from come from `GET /clients/<id>/charges/template` (`chargeOptions`). The
  server allows only one kind of client charge, a flat charge with a specified due date, so the
  form has no time-type or calculation branches;
- the amount and due date fields appear only once a charge is chosen; the amount starts at the
  charge's own amount, the due date at today;
- Save is disabled until a charge is chosen, the amount is a number above zero and the due date
  is a real date;
- `POST /clients/<id>/charges` sends `chargeId`, `amount`, `dueDate` (ISO) with the date format
  and locale. The amount is always sent: the server's API document calls it optional, but the
  server answers "The parameter `amount` is mandatory" without it;
- the new charge is listed and the form closes. A refusal about the amount or due date is shown
  under that field (a due date before the client's activation is refused on `dueDate`), anything
  else above the form; the form keeps what was typed.

**Pay** (`PAY_CLIENTCHARGE`), offered while something is outstanding (not paid, not waived):

- the pay form opens in the row, with the amount set to what is outstanding and the date to today;
- `POST /clients/<id>/charges/<chargeId>?command=paycharge` sends `amount` and `transactionDate`
  with the date format and locale; the row then shows the new paid and outstanding amounts. A
  part payment leaves the charge outstanding, so Pay stays offered;
- a refusal (more than is outstanding, a date in the future) is shown in the row; the form keeps
  what was typed.

**Waive** (`WAIVE_CLIENTCHARGE`), offered while something is outstanding: confirmed in place, then
`POST /clients/<id>/charges/<chargeId>?command=waive` with an empty body; the row shows Waived and
offers nothing more. Cancel sends nothing.

**Delete** (`DELETE_CLIENTCHARGE`), offered only for a charge with nothing paid and nothing waived:
the server refuses the rest ("cannot be deleted as transactions have been made on the same").
Confirmed in place, then `DELETE /clients/<id>/charges/<chargeId>`; the charge leaves the list.

Every write reloads the list, and the client's page is not reloaded: charges change nothing it
shows. The screen shows the shared loading, error-with-retry and empty states, and links back to
the client.

**Out of scope:** a charge's transaction history and undoing a payment (the server has no client
charge undo), inactivating a charge, and charges on loans, savings and shares (their own phases).

## Mock data

`e2e/web/mocks/charges.ts`, a small stateful charges backend:

- **Charge definitions** (the template's `chargeOptions`): 1 "Membership fee", 100 USD; 2 "Late
  payment penalty", 25.50 USD, a penalty.
- **Ada Lovelace (1)**, active since 2024-03-01:
  - 1 "Membership fee", due 2026-02-15, 100.00, 30.00 paid, 70.00 outstanding;
  - 2 "Late payment penalty", due 2026-03-01, 25.50 outstanding;
  - 3 "Membership fee", due 2026-03-10, 40.00, waived.
- **Acme Traders Ltd (2)**, active: no charges. **Grace Hopper (3)**, pending: no charges.
- Refusals, in the shapes captured from the e2e stack: a due date before the client's activation
  (400 on `dueDate`), a payment above what is outstanding (400 with no parameter), and deleting a
  charge with transactions (403).

**Personas** added: `chargeAdmin` (`READ_CLIENT` and read, create, pay, waive and delete for
`CLIENTCHARGE`), `chargeReader` (`READ_CLIENT`, `READ_CLIENTCHARGE`).

## E2E scenarios: adding a charge (P1-CLIENTS-001)

| ID               | Scenario                                                                                                                                                                                                                                                                                                   | Level                       | Status |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| P1-CLIENTS-001/1 | **Given** `chargeAdmin` on Acme's charges, **when** Add charge is chosen, **then** the choices come from the template, the amount and due date appear only once a charge is chosen, the amount starts at the charge's own 25.50 and the due date at today, and Save is disabled for a blank or zero amount | web                         | green  |
| P1-CLIENTS-001/2 | **When** the charge is saved, **then** `POST` carries `chargeId`, the typed `amount`, the ISO `dueDate`, the date format and the locale, the form closes and the charge is listed as Outstanding                                                                                                           | web                         | green  |
| P1-CLIENTS-001/3 | **When** the server refuses a due date before the client's activation, **then** its reason is shown under the due date and the typed values stay                                                                                                                                                           | web                         | green  |
| P1-CLIENTS-001/4 | **Then** Add charge is not offered for pending Grace, nor to `chargeReader`                                                                                                                                                                                                                                | web                         | green  |
| P1-CLIENTS-001/5 | **Against** the docker stack, a client charge defined through the API is added to a new active client from the screen and listed with its amount outstanding                                                                                                                                               | web-backend, native-backend | green  |

## E2E scenarios: charge operations (P1-CLIENTS-002)

| ID               | Scenario                                                                                                                                                                                                                                                                        | Level       | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-CLIENTS-002/1 | **Given** `chargeAdmin`, **when** "Charges" is chosen on Ada's page, **then** her three charges are listed with due date, amounts, status and the penalty marked; Acme's says there are none                                                                                    | web         | green  |
| P1-CLIENTS-002/2 | **When** Pay is chosen for the penalty, **then** the amount starts at the 25.50 outstanding and the date at today; paying 10 sends `paycharge` with `amount`, `transactionDate`, date format and locale, and the row shows 10.00 paid and 15.50 outstanding, still offering Pay | web         | green  |
| P1-CLIENTS-002/3 | **When** a payment above what is outstanding is refused, **then** the server's reason is shown in the row and the typed amount stays                                                                                                                                            | web         | green  |
| P1-CLIENTS-002/4 | **When** Waive is chosen and cancelled, nothing is sent; **when** confirmed, `waive` is sent with an empty body and the row shows Waived with no Pay, Waive or Delete                                                                                                           | web         | green  |
| P1-CLIENTS-002/5 | **Then** Delete is offered only for the charge with nothing paid or waived; once confirmed, `DELETE` is sent and the charge leaves the list                                                                                                                                     | web         | green  |
| P1-CLIENTS-002/6 | **Given** `clerk`, **then** the client's page has no Charges link and `/clients/1/charges` by URL shows Access Denied naming `READ_CLIENTCHARGE`; **given** `chargeReader`, the charges are listed with no Add, Pay, Waive or Delete                                            | web         | green  |
| P1-CLIENTS-002/7 | **When** the charges fail to load (500), **then** an error with "Try again" is shown, and trying again after recovery lists them                                                                                                                                                | web         | green  |
| P1-CLIENTS-002/8 | **Against** the docker stack, a charge is paid in full and shows Paid, another is waived and shows Waived, and an untouched one is deleted                                                                                                                                      | web-backend | green  |

## Unit and component cases

- **`HttpClientChargeApi`**:
  - `charges()` maps the captured list (`stack.client.charges.json`): the `[y, m, d]` due date,
    the amounts, the currency's code and decimal places, the penalty flag, and the status from the
    flags (waived, outstanding, partly paid); fails loudly without an id;
  - `chargeOptions()` reads `chargeOptions` from the captured template, with each charge's amount
    and currency;
  - `addCharge()` sends the amount and the ISO due date with the date fields;
  - `payCharge()` sends `command=paycharge` with the amount and date; `waiveCharge()` sends
    `command=waive` with an empty body; `deleteCharge()` hits the charge's path.
- **Money**: `formatMoney` shows the currency's decimal places (two, and none) and keeps a
  negative sign; `parseAmount` reads plain amounts above zero and refuses blanks, zero, signs,
  separators and more decimal places than the currency has.
- **Components** (`ClientChargesScreen`): Add, Pay, Waive and Delete follow permission, the
  client's status and the charge's state; the amount and due date appear only once a charge is
  chosen; Save and Pay are disabled until valid; a waive and a delete are confirmed in place; a
  server field error lands under its field.

## Status notes

- **Specified first**, then implemented: every scenario started red. The web scenarios and
  both web-backend scenarios passed locally against the docker stack on 2026-10-30; the Android
  flow (P1-CLIENTS-001/5) runs in CI.
- **Captured shapes** (e2e stack, 2026-10-30, `stack.client.charge*.json`,
  `client.charge.delete-paid.json` and `client.charge.delete-with-transactions.json`): the
  community sandbox refused the demo credentials that day. The server also showed that only
  flat, specified-due-date charges may apply to clients (an annual one is refused on
  `chargeTimeType`), that `amount` is required on add despite the API document, and that a
  payment needs `transactionDate`. Deleting a charge is refused two ways: a fully paid one with a
  400 (`charge.is.paid`), a part-paid or waived one with a 403 (`cannot.be.deleted`).
