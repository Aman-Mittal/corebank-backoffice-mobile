# P1-13: Client family members

## Scope

A client's family members, on their own screen under the client's page: listed, added, edited and
deleted. Behaviour follows fineract-backoffice-ui's `client-family-members-list` and
`client-family-member-form` (Apache-2.0). The web-app's `kyc/family-members` spec is a behaviour
reference only (MPL-2.0: nothing copied).

**On the client's page**, "Family members" opens `/clients/<id>/family`. The link is shown only to
a user who may read them (`READ_FAMILYMEMBERS`).

**The list** (`GET /clients/<id>/familymembers`, in the server's order). Each row shows the full
name, the relationship, and the gender, profession, mobile number, age and date of birth when
known, and "Dependent" for a dependent.

**The form**, for adding (`CREATE_FAMILYMEMBERS`) and editing (`UPDATE_FAMILYMEMBERS`):

- first name, middle name and last name; first and last are required;
- relationship (required), gender, marital status and profession, each chosen from the template
  (`GET /clients/<id>/familymembers/template`: `relationshipIdOptions`, `genderIdOptions`,
  `maritalStatusIdOptions`, `professionIdOptions`). These are code values an administrator fills;
  with no relationships set up, the form says so and cannot be saved;
- qualification, mobile number, age (a whole number) and date of birth (ISO), all optional, and
  whether the member is a dependent;
- Save is disabled until the required fields are given and the optional ones are valid;
- `POST /clients/<id>/familymembers` (add) and `PUT /clients/<id>/familymembers/<memberId>` (edit)
  send the names trimmed, the chosen ids, `isDependent`, and the optional fields only when given;
  the date of birth goes with the date format and locale.

**Server behaviour this works around**, seen on the e2e stack:

- **Relationship is required, though not validated.** The server accepts a request without
  `relationshipId`, then fails in the database with a 403 data-integrity error. The form therefore
  requires it.
- **An edit must send all three optional choices.** `PUT` throws a NullPointerException (500)
  unless `genderId`, `maritalStatusId` and `professionId` are all present. The server stores and
  answers `0` for "none", so an edit sends `0` for any left unchosen; reads map `0` to none.
- **An edit replaces the whole member.** A `PUT` that leaves out a name clears it (a `PUT` with
  only `lastName` blanked the first name), so an edit always sends every field the form holds.

**Delete** (`DELETE_FAMILYMEMBERS`): confirmed in place, then
`DELETE /clients/<id>/familymembers/<memberId>`; the member leaves the list.

A refusal about a field is shown under it, anything else above the form; the form keeps what was
typed. The screen shows the shared loading, error-with-retry and empty states, and links back to
the client.

**Out of scope:** family members as clients of their own, and the family member options of the
client template (they repeat this template).

## Mock data

`e2e/web/mocks/family.ts`, a small stateful backend:

- **Template** (code values as the server sends them): relationships 26 Spouse and 27 Son;
  gender 28 Female; marital status 29 Married; profession 30 Teacher.
- **Ada Lovelace (1)**: Mary Ann Lovelace, Spouse, Female, Married, Teacher, mobile 5550101,
  age 34, born 1992-04-03, not dependent; Tom Lovelace, Son, dependent, with the other choices
  `0`, as the server answers them.
- **Acme Traders Ltd (2)**: none. A template with no relationships (`noRelationships`).
- `PUT` answers 500 unless the three optional choices are present, as the server does.

**Personas** added: `familyAdmin` (`READ_CLIENT` and read, create, update and delete for
`FAMILYMEMBERS`), `familyReader` (`READ_CLIENT`, `READ_FAMILYMEMBERS`).

## E2E scenarios: family members (P1-CLIENTS-019)

| ID               | Scenario                                                                                                                                                                                                                                                                                         | Level                       | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------ |
| P1-CLIENTS-019/1 | **Given** `familyAdmin`, **when** "Family members" is chosen on Ada's page, **then** Mary is listed with Spouse, Female, Teacher, 5550101, age 34 and 1992-04-03, and Tom with Son and Dependent but no gender or profession; Acme's says there are none                                         | web                         | green  |
| P1-CLIENTS-019/2 | **When** a member is added, **then** the choices come from the template, Save waits for both names and a relationship, and `POST` carries the trimmed names, `relationshipId`, `isDependent` and only the optional fields given; the member is listed                                            | web                         | green  |
| P1-CLIENTS-019/3 | **When** Tom is edited and only his last name changed, **then** `PUT` carries his first name, `isDependent`, and `genderId`, `maritalStatusId` and `professionId` as `0`, and the list shows the new name; **when** the age is not a whole number, Save is disabled                              | web                         | green  |
| P1-CLIENTS-019/4 | **When** a member's Delete is cancelled nothing is sent; once confirmed, `DELETE` is sent and the member leaves the list                                                                                                                                                                         | web                         | green  |
| P1-CLIENTS-019/5 | **Given** a template with no relationships, **then** the form says so and Save stays disabled; **given** `clerk`, the client's page has no Family members link and the URL shows Access Denied naming `READ_FAMILYMEMBERS`; **given** `familyReader`, the list shows with no Add, Edit or Delete | web                         | green  |
| P1-CLIENTS-019/6 | **Against** the docker stack, a family member with a seeded relationship is added from the screen, edited, and deleted                                                                                                                                                                           | web-backend, native-backend | green  |

## Unit and component cases

- **`HttpFamilyApi`**:
  - `mapFamilyMember` maps the captured list (`stack.client.familymembers.json`): names, the chosen
    ids and labels, `0` read as none, the ISO date of birth, age `0` read as unknown;
  - `options()` reads the four option lists from the captured template;
  - `add()` omits blank optional fields and sends the date of birth with format and locale;
    `update()` sends `0` for each unchosen optional choice; `remove()` hits the member's path.
- **Components** (`FamilyMembersScreen`): controls follow permission; Save waits for the required
  fields and a valid age; an edit starts from the member's values; a delete is confirmed in place;
  a server field error lands under its field.

## Status notes

- **Specified first**, then implemented: every scenario started red. The web scenarios and the
  web-backend scenario passed locally against the docker stack on 2026-10-30; the Android flow
  (P1-CLIENTS-019/6) runs in CI.
- **Captured shapes** (e2e stack, 2026-10-30): `stack.client.familymembers.json` and
  `stack.client.familymembers.template.json`, after seeding the RELATIONSHIP, Gender, MARITAL
  STATUS and PROFESSION codes, which the stack ships empty. The list sends `dateOfBirth` as an ISO
  string, not `[y, m, d]`, and `0` for an unchosen code value and an unknown age.
