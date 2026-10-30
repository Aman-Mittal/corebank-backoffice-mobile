# Captured backend payloads

Mapper tests run against these, never against objects built from the generated types: a fixture
built from a generated type inherits the spec's blind spots.

- `offices.list.json` is the `GET /v1/offices` payload captured from a running instance in
  fineract-backoffice-ui issue #653 (Apache-2.0). `openingDate` arrives as `[y, m, d]`, and
  `parentId` and `parentName` are present although the spec does not declare them.
- `authentication.json` is the `POST /v1/authentication` shape. The two flags the spec does not
  declare (`isTwoFactorAuthenticationRequired`, `shouldRenewPassword`) are the ones
  fineract-backoffice-ui reads from live responses. The e2e stack's own is
  `stack.authentication.json`, captured with `npm run e2e:stack` followed by
  `curl -k -H 'Fineract-Platform-TenantId: default' -H 'Content-Type: application/json' -d '{"username":"mifos","password":"password"}' https://localhost:8443/fineract-provider/api/v1/authentication`.
- `staff.list.json` is the `GET /v1/staff?status=all` shape. `joiningDate` arrives as a string
  (fineract-backoffice-ui verified this against a running instance; see its `staff.api.ts`), and
  `emailAddress` is sent although the spec does not declare it. The public sandbox had no staff
  to capture on 2026-10-16; the e2e stack's list is `stack.staff.list.json`.
- `clients.page.json` (`GET /v1/clients?offset=0&limit=3&orderBy=displayName&sortOrder=ASC`) and
  `client.one.json` (`GET /v1/clients/3`) were captured from the community sandbox
  (`https://sandbox.mifos.community`, tenant `default`) on 2026-10-17. Both send `legalForm`,
  `timeline` and `[y, m, d]` dates; the spec declares none of these on the list item, and
  `status` sends `value` where the spec declares `description`. The sandbox had people only, so
  the entity case is covered by the e2e stack (P1-CLIENTS-005/1).
- `client.template.reject.json` (`GET /v1/clients/template?commandParam=reject`) was captured from
  the community sandbox on 2026-10-17. Its `narrations` is empty, as were `withdraw` and `close`
  there: no reasons are set up, which the client lifecycle panel must handle (P1-CLIENTS-014/2).
  A reason has the server's `CodeValueData` shape (`id`, `name`, `position`, `active`,
  `mandatory`); a populated one from the e2e stack is `stack.client.template.reject.json`.
- `client.identifiers.template.json` (`GET /v1/clients/3/identifiers/template`) was captured from
  the community sandbox on 2026-10-17: its `allowedDocumentTypes` are the four seeded document
  types. No client there had identifiers or notes to capture, so those payloads follow the
  server's `ClientIdentifierData` and `NoteData` (P1-07); the e2e stack's are below.
- `user.one.json` (`GET /v1/users/1`) and `passwordpreferences.json` (`GET /v1/passwordpreferences`)
  were captured from the community sandbox on 2026-10-29. The user's roles arrive in
  `selectedRoles` with `description` and `disabled` beside the declared `id` and `name`; the
  policy endpoint answers the one active policy as an object, not a list.

## Captured from the e2e stack

`stack.*.json` were captured from the docker stack (`npm run e2e:stack`, `apache/fineract:latest`)
on 2026-10-17, after the backend suite had seeded it. Seeded random names are replaced by stable
ones, and long lists are cut to their first entries; nothing else is edited.

- `stack.authentication.json` (`POST /v1/authentication` as `mifos`): no `staffDisplayName`,
  since that user is linked to no staff, and two permissions besides `ALL_FUNCTIONS`.
- `stack.staff.list.json` (`GET /v1/staff?status=all`): `joiningDate` is a string here, with a
  `dateFormat` beside it.
- `stack.client.template.office.json` (`GET /v1/clients/template?officeId=1`, `staffOptions`
  only): here the same staff send `joiningDate` as `[y, m, d]`.
- `stack.client.template.reject.json` (`GET /v1/clients/template?commandParam=reject`) with a
  seeded reason.
- `stack.client.identifiers.json` and `stack.client.notes.json`: an identifier's `documentType`
  carries only `id` and `name`, and a note's `createdOn` is a date-time with offset.
- `client.identifier.duplicate.json`: the refusal of a duplicate identifier key. It is a 403
  domain rule whose error names `parameterName: "id"`, not `documentKey`; only its globalisation
  code (`error.msg.clientIdentifier.identityKey.duplicate`) says which field it is about. The
  client and key in it are replaced by Ada Lovelace's.

### Client charges (2026-10-30)

Captured from the e2e stack after seeding two client charge definitions ("E2E Client Fee", 100 USD;
"E2E Client Penalty", 25.50 USD) and a client charged with each. The community sandbox refused
the demo credentials that day.

- `stack.client.charges.template.json` (`GET /v1/clients/14/charges/template`): `chargeOptions`
  are full `ChargeData`, each with its amount and currency.
- `stack.client.charges.json` (`GET /v1/clients/14/charges`): a page (`totalFilteredRecords`,
  `pageItems`), latest due date first; `dueDate` is `[y, m, d]`; a waived, an outstanding penalty
  and a fully paid charge.
- `stack.client.charge.partly-paid.json` (`GET /v1/clients/14/charges/1` after paying 30 of 100):
  still neither paid nor waived.
- `client.charge.delete-paid.json`: deleting a fully paid charge is refused as a 400 validation
  error (`charge.is.paid`) with no parameter. `client.charge.delete-with-transactions.json`:
  deleting a part-paid one is refused as a 403 (`error.msg.client.charge.cannot.be.deleted`).
