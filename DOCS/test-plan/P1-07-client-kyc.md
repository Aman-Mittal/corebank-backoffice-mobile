# P1-07: Client identifiers and notes

## Scope

A client's identity documents (identifiers) and notes, each on its own screen under the client's
page. Behaviour follows fineract-backoffice-ui's `clients/kyc` (Apache-2.0); the web-app's
`kyc/identifiers-and-notes` spec is a behaviour reference only (MPL-2.0: nothing copied). Family
members, documents (files), addresses and images are later slices of the same parity rows.

**On the client's page**, "Identifiers" and "Notes" open the two screens. Each link is shown only
to a user who may read what it opens (`READ_CLIENTIDENTIFIER`, `READ_CLIENTNOTE`).

**Identifiers** (`/clients/<id>/identifiers`, `READ_CLIENTIDENTIFIER`):

- `GET /clients/<id>/identifiers`; each row: document type, document key, description and status
  (from the status code `clientIdentifierStatusType.active|inactive`, never a label).
- **Add** (`CREATE_CLIENTIDENTIFIER`): document type, from the template
  (`GET /clients/<id>/identifiers/template`, `allowedDocumentTypes`); document key (required,
  trimmed); description (optional). "Save" stays disabled until a type and a key are given.
  `POST /clients/<id>/identifiers` sends `documentTypeId`, `documentKey`, `status: "Active"` and
  the description only when given. The new identifier is listed and the form closes.
- A server refusal about the key or the type is shown under that field; anything else above the
  form. The form keeps what was typed. A duplicate key (one any client already holds) arrives as
  a 403 domain rule on `id`, so it is placed by its code,
  `error.msg.clientIdentifier.identityKey.duplicate`.
- **Delete** (`DELETE_CLIENTIDENTIFIER`): each row's Delete asks to confirm in place; Cancel keeps
  it, Confirm sends `DELETE /clients/<id>/identifiers/<identifierId>` and it leaves the list.

**Notes** (`/clients/<id>/notes`, `READ_CLIENTNOTE`):

- `GET /clients/<id>/notes`, newest first; each note shows its text, author and the day it was
  written (`createdOn` is an ISO date-time; the day is shown in the user's calendar).
- **Add** (`CREATE_CLIENTNOTE`): one text box; "Add note" is disabled while it is blank.
  `POST /clients/<id>/notes` sends `{ note }` (trimmed); the note appears without a reload and
  the box empties.
- **Edit** (`UPDATE_CLIENTNOTE`): Edit turns the note into a text box with Save and Cancel.
  `PUT /clients/<id>/notes/<noteId>` sends `{ note }`; Cancel restores the text and sends nothing.
- **Delete** (`DELETE_CLIENTNOTE`): confirmed in place, then
  `DELETE /clients/<id>/notes/<noteId>`.

Both screens show the shared loading, error-with-retry and empty states, and link back to the
client.

**Out of scope:** identifier issue and expiry dates, editing an identifier, identifier documents
(attachments), family members, client documents, addresses and images.

## Mock data

`e2e/web/mocks/kyc.ts`, a small stateful backend per client:

- **Document types** (the sandbox's): 1 Passport, 2 Id, 3 Drivers License, 4 Any Other Id Type.
- **Client 1 Ada Lovelace:** one identifier (Passport `P-ADA-1`, "Issued in London", active) and
  two notes ("Prefers morning visits" by `mifos` on 2026-10-01; "Asked about a second loan" by
  `clerk` on 2026-10-05).
- **Client 2 Acme Traders Ltd:** no identifiers, no notes.
- A duplicate document key answers the server's refusal as captured from the e2e stack: 403,
  a domain rule on `id` with the code `error.msg.clientIdentifier.identityKey.duplicate`.

**Personas** added: `kycAdmin` (`READ_CLIENT` and read, create, update and delete for
`CLIENTIDENTIFIER` and `CLIENTNOTE`), `kycReader` (`READ_CLIENT`, `READ_CLIENTIDENTIFIER`,
`READ_CLIENTNOTE`).

## E2E scenarios: identifiers and notes (P1-CLIENTS-020)

| ID                | Scenario                                                                                                                                                                                                                                                   | Level       | Status |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| P1-CLIENTS-020/1  | **Given** `kycAdmin`, **when** "Identifiers" is chosen on Ada's page, **then** the identifiers screen lists Passport `P-ADA-1` with its description and Active; Acme's says it has none                                                                    | web         | green  |
| P1-CLIENTS-020/2  | **When** an identifier is added, **then** the types come from the template, "Save" is disabled until a type and a key are given, `POST` carries `documentTypeId`, the trimmed `documentKey`, `status: "Active"` and no blank description, and it is listed | web         | green  |
| P1-CLIENTS-020/3  | **When** the server refuses a duplicate key, **then** the message is shown under the key and the typed values stay                                                                                                                                         | web         | green  |
| P1-CLIENTS-020/4  | **When** Delete is pressed, **then** it asks to confirm; Cancel keeps the identifier; Confirm sends `DELETE` and it leaves the list                                                                                                                        | web         | green  |
| P1-CLIENTS-020/5  | **The notes screen** lists Ada's notes newest first with author and day; **when** a note is added, `POST` carries the trimmed `{ note }`, it appears at the top without a reload, and "Add note" is disabled for a blank note                              | web         | green  |
| P1-CLIENTS-020/6  | **When** a note is edited, **then** `PUT` carries the new text and the note shows it; **when** an edit is cancelled, the old text stays and nothing is sent                                                                                                | web         | green  |
| P1-CLIENTS-020/7  | **When** a note's Delete is confirmed, **then** `DELETE` is sent and the note leaves the list                                                                                                                                                              | web         | green  |
| P1-CLIENTS-020/8  | **Given** `clerk`, **then** the client's page has no Identifiers or Notes link, and `/clients/1/notes` by URL shows Access Denied naming `READ_CLIENTNOTE`; **given** `kycReader`, both screens list but offer no add, edit or delete                      | web         | green  |
| P1-CLIENTS-020/9  | **When** the notes fail to load (500), **then** an error with "Try again" is shown, and trying again after recovery lists them                                                                                                                             | web         | green  |
| P1-CLIENTS-020/10 | **Against** the docker stack, a Passport identifier and a note added to a new client are listed                                                                                                                                                            | web-backend | green  |
| P1-CLIENTS-020/11 | **Against** the docker stack, a Passport key another client already holds is refused, the reason shown under the key, which keeps its value                                                                                                                | web-backend | green  |
| P1-CLIENTS-020/12 | **Against** the docker stack, an identifier is deleted, and a note added, edited (kept after a reload) and deleted                                                                                                                                         | web-backend | green  |

## Unit and component cases

- **`HttpClientKycApi`**:
  - `identifiers()` maps type, key, description and the status code; fails loudly without an id;
  - `documentTypes()` reads `allowedDocumentTypes` (captured from the community sandbox), active
    ones in their order;
  - `addIdentifier()` sends `status: "Active"` and omits a blank description;
  - `notes()` maps text, author and `createdOn` and sorts newest first;
  - `addNote()` / `updateNote()` send `{ note }`; both deletes hit the right path.
- **Components** (`ClientIdentifiersScreen`, `ClientNotesScreen`): controls follow permission;
  Save and Add are disabled until valid; a delete is confirmed in place; an edit can be
  cancelled; a server field error lands under its field.

## Status notes

- **Specified first**, then implemented: every scenario started red. The web scenarios are
  green, and P1-CLIENTS-020/10 turned green when the nightly pending probe of 2026-10-17 reported
  it passing against the docker stack.
- **Edit boxes are text areas** on web, whose text is what was typed: a spec waits for the box
  to close before reading the saved note, or it reads the draft.
- **Captured shapes:** the template came from the community sandbox, which had no identifiers or
  notes; identifier and note payloads were then captured from the e2e stack
  (`stack.client.*.json`, 2026-10-17) and the mapper tests run on them.
- **A refusal the mock had wrong, found against the stack (P1-CLIENTS-020/11):** the server
  refuses a duplicate key as a 403 domain rule on `parameterName: "id"`, not as a validation
  error on `documentKey`, so the app showed it above the form. Forms can now place a message by
  its error code (`error.msg.clientIdentifier.identityKey.duplicate` → the key field), and the
  mock answers the captured shape (`client.identifier.duplicate.json`).
