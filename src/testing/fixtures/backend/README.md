# Captured backend payloads

Mapper tests run against these, never against objects built from the generated types: a fixture
built from a generated type inherits the spec's blind spots.

- `offices.list.json` is the `GET /v1/offices` payload captured from a running instance in
  fineract-backoffice-ui issue #653 (Apache-2.0). `openingDate` arrives as `[y, m, d]`, and
  `parentId` and `parentName` are present although the spec does not declare them.
- `authentication.json` is the `POST /v1/authentication` shape. The two flags the spec does not
  declare (`isTwoFactorAuthenticationRequired`, `shouldRenewPassword`) are the ones
  fineract-backoffice-ui reads from live responses. **Re-capture** this from the e2e stack with
  `npm run e2e:stack` followed by
  `curl -k -H 'Fineract-Platform-TenantId: default' -H 'Content-Type: application/json' -d '{"username":"mifos","password":"password"}' https://localhost:8443/fineract-provider/api/v1/authentication`.
- `staff.list.json` is the `GET /v1/staff?status=all` shape. `joiningDate` arrives as a string
  (fineract-backoffice-ui verified this against a running instance; see its `staff.api.ts`), and
  `emailAddress` is sent although the spec does not declare it. The public sandbox had no staff
  to capture on 2026-10-16, so **re-capture** this from the e2e stack once staff exist there.
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
  `mandatory`); **re-capture** a populated one from the e2e stack once reasons are seeded.
