/*
 * Copyright 2026 Aman Mittal
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Handler } from './api';
import { fieldRejection } from './organization';

/** The document types the community sandbox offers (`identifiers/template`). */
export const DOCUMENT_TYPES = [
  { id: 1, name: 'Passport', position: 1, active: true, mandatory: false },
  { id: 2, name: 'Id', position: 2, active: true, mandatory: false },
  { id: 3, name: 'Drivers License', position: 3, active: true, mandatory: false },
  { id: 4, name: 'Any Other Id Type', position: 4, active: true, mandatory: false },
];

const ACTIVE = 'clientIdentifierStatusType.active';
const CLIENT_NOTE = { id: 100, code: 'noteType.client', value: 'Client' };

/**
 * Identifiers and notes in the server's shapes (`ClientIdentifierData`, `NoteData`), per client
 * (DOCS/test-plan/P1-07-client-kyc.md). Ada (1) has one identifier and two notes; Acme (2) none.
 */
export const IDENTIFIERS: Record<number, Record<string, unknown>[]> = {
  1: [
    {
      id: 1,
      clientId: 1,
      documentType: DOCUMENT_TYPES[0],
      documentKey: 'P-ADA-1',
      description: 'Issued in London',
      status: ACTIVE,
    },
  ],
  2: [],
};

export const NOTES: Record<number, Record<string, unknown>[]> = {
  1: [
    {
      id: 1,
      clientId: 1,
      noteType: CLIENT_NOTE,
      note: 'Prefers morning visits',
      createdById: 1,
      createdByUsername: 'mifos',
      createdOn: '2026-10-01T09:30:00Z',
    },
    {
      id: 2,
      clientId: 1,
      noteType: CLIENT_NOTE,
      note: 'Asked about a second loan',
      createdById: 2,
      createdByUsername: 'clerk',
      createdOn: '2026-10-05T14:00:00Z',
    },
  ],
  2: [],
};

const boom = { status: 500, body: { developerMessage: 'boom' } };
const lastId = (path: string) => Number(new URL(path).pathname.split('/').pop());

/**
 * A small stateful identifiers-and-notes backend for clients 1 and 2. Adds and deletes change
 * what the next read answers, so a screen that reloads sees them.
 */
export function kycHandlers(options: { failNotesOnce?: boolean } = {}): Record<string, Handler> {
  const identifiers = structuredClone(IDENTIFIERS);
  const notes = structuredClone(NOTES);
  let notesFailures = options.failNotesOnce ? 1 : 0;
  let nextId = 10;
  const handlers: Record<string, Handler> = {};

  for (const clientId of [1, 2]) {
    const base = `/v1/clients/${clientId}`;
    handlers[`GET ${base}/identifiers`] = () => ({ status: 200, body: identifiers[clientId]! });
    handlers[`GET ${base}/identifiers/template`] = () => ({
      status: 200,
      body: { allowedDocumentTypes: DOCUMENT_TYPES },
    });
    handlers[`POST ${base}/identifiers`] = (req) => {
      const body = req.postDataJSON() as Record<string, unknown>;
      if (identifiers[clientId]!.some((i) => i.documentKey === body.documentKey)) {
        return fieldRejection(
          'documentKey',
          `Identifier with key ${String(body.documentKey)} already exists`,
        );
      }
      const id = nextId++;
      identifiers[clientId]!.push({
        id,
        clientId,
        documentType: DOCUMENT_TYPES.find((t) => t.id === body.documentTypeId),
        documentKey: body.documentKey,
        description: body.description,
        status: ACTIVE,
      });
      return { status: 200, body: { clientId, officeId: 1, resourceId: id } };
    };
    handlers[`GET ${base}/notes`] = () => {
      if (notesFailures > 0) {
        notesFailures -= 1;
        return boom;
      }
      return { status: 200, body: notes[clientId]! };
    };
    handlers[`POST ${base}/notes`] = (req) => {
      const body = req.postDataJSON() as { note: string };
      const id = nextId++;
      notes[clientId]!.push({
        id,
        clientId,
        noteType: CLIENT_NOTE,
        note: body.note,
        createdById: 1,
        createdByUsername: 'mifos',
        createdOn: '2026-10-10T08:00:00Z',
      });
      return { status: 200, body: { officeId: 1, clientId, resourceId: id } };
    };
    for (let id = 1; id < 20; id += 1) {
      handlers[`DELETE ${base}/identifiers/${id}`] = (req) => {
        identifiers[clientId] = identifiers[clientId]!.filter((i) => i.id !== lastId(req.url()));
        return { status: 200, body: { clientId, resourceId: id } };
      };
      handlers[`PUT ${base}/notes/${id}`] = (req) => {
        const found = notes[clientId]!.find((n) => n.id === lastId(req.url()));
        if (found) found.note = (req.postDataJSON() as { note: string }).note;
        return { status: 200, body: { clientId, resourceId: id, changes: {} } };
      };
      handlers[`DELETE ${base}/notes/${id}`] = (req) => {
        notes[clientId] = notes[clientId]!.filter((n) => n.id !== lastId(req.url()));
        return { status: 200, body: { clientId, resourceId: id } };
      };
    }
  }
  return handlers;
}
