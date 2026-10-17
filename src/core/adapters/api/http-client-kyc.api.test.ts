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

import template from '@/testing/fixtures/backend/client.identifiers.template.json';
import stackIdentifiers from '@/testing/fixtures/backend/stack.client.identifiers.json';
import stackNotes from '@/testing/fixtures/backend/stack.client.notes.json';
import { fakeApi } from '@/testing/fake-api';

import { HttpClientKycApi, mapIdentifier, mapNote } from './http-client-kyc.api';

/** `ClientIdentifierData` as the server builds it (not captured: the sandbox has none). */
const PASSPORT = {
  id: 7,
  clientId: 3,
  documentType: { id: 1, name: 'Passport', position: 1, active: true, mandatory: false },
  documentKey: 'P-1',
  description: 'Issued in London',
  status: 'clientIdentifierStatusType.active',
};

describe('mapIdentifier / mapNote', () => {
  it('maps type, key, description and the status code', () => {
    expect(mapIdentifier(PASSPORT)).toEqual({
      id: 7,
      documentTypeId: 1,
      documentTypeName: 'Passport',
      documentKey: 'P-1',
      description: 'Issued in London',
      status: 'active',
    });
    expect(
      mapIdentifier({ id: 8, status: 'clientIdentifierStatusType.inactive', description: '' }),
    ).toMatchObject({ status: 'inactive', description: null, documentTypeId: null });
    expect(mapIdentifier({ id: 9, status: 'clientIdentifierStatusType.invalid' }).status).toBe(
      'unknown',
    );
  });

  it('maps a note, and fails loudly on either without an id', () => {
    expect(
      mapNote({ id: 1, note: 'Hi', createdByUsername: 'mifos', createdOn: '2026-10-01T09:30:00Z' }),
    ).toEqual({ id: 1, note: 'Hi', createdBy: 'mifos', createdOn: '2026-10-01T09:30:00Z' });
    expect(() => mapNote({ note: 'x' })).toThrow(/no id/);
    expect(() => mapIdentifier({ documentKey: 'x' })).toThrow(/no id/);
  });
});

describe('payloads captured from the e2e stack', () => {
  it('maps an identifier, whose document type carries only an id and a name', () => {
    expect(stackIdentifiers.map(mapIdentifier)).toEqual([
      {
        id: 11,
        documentTypeId: 1,
        documentTypeName: 'Passport',
        documentKey: 'P-ADA-1',
        description: 'Issued in London',
        status: 'active',
      },
    ]);
  });

  it('maps a note, keeping its date-time with offset', () => {
    expect(stackNotes.map(mapNote)).toEqual([
      {
        id: 4,
        note: 'Prefers morning visits',
        createdBy: 'mifos',
        createdOn: '2026-10-17T16:19:55.462952+05:30',
      },
    ]);
  });
});

describe('HttpClientKycApi', () => {
  it('lists identifiers, treating an empty body as none', async () => {
    const api = fakeApi({ 'GET /v1/clients/3/identifiers': [200, [PASSPORT]] });
    expect((await new HttpClientKycApi(api.client).identifiers(3)).map((i) => i.id)).toEqual([7]);
    const none = fakeApi({ 'GET /v1/clients/3/identifiers': [200, null] });
    expect(await new HttpClientKycApi(none.client).identifiers(3)).toEqual([]);
  });

  it('reads the document types of the captured template, active ones in order', async () => {
    const api = fakeApi({ 'GET /v1/clients/3/identifiers/template': [200, template] });
    expect(await new HttpClientKycApi(api.client).documentTypes(3)).toEqual([
      { id: 1, name: 'Passport' },
      { id: 2, name: 'Id' },
      { id: 3, name: 'Drivers License' },
      { id: 4, name: 'Any Other Id Type' },
    ]);
    const mixed = fakeApi({
      'GET /v1/clients/3/identifiers/template': [
        200,
        {
          allowedDocumentTypes: [
            { id: 2, name: 'B', position: 2, active: true },
            { id: 3, name: 'Old', position: 0, active: false },
            { id: 1, name: 'A', position: 1, active: true },
          ],
        },
      ],
    });
    expect(await new HttpClientKycApi(mixed.client).documentTypes(3)).toEqual([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]);
  });

  it('adds an identifier as Active, trimmed, without a blank description', async () => {
    const api = fakeApi({
      'POST /v1/clients/3/identifiers': [200, { clientId: 3, officeId: 1, resourceId: 12 }],
    });
    const http = new HttpClientKycApi(api.client);
    const id = await http.addIdentifier(3, {
      documentTypeId: 2,
      documentKey: ' ID-1 ',
      description: '  ',
    });
    expect(id).toBe(12);
    expect(api.requests[0]!.body).toEqual({
      documentTypeId: 2,
      documentKey: 'ID-1',
      status: 'Active',
    });
    await http.addIdentifier(3, { documentTypeId: 1, documentKey: 'P', description: ' Seen ' });
    expect(api.requests[1]!.body).toMatchObject({ description: 'Seen' });
  });

  it('deletes an identifier by its path', async () => {
    const api = fakeApi({ 'DELETE /v1/clients/3/identifiers/7': [200, { resourceId: 7 }] });
    await new HttpClientKycApi(api.client).deleteIdentifier(3, 7);
    expect(api.requests[0]!.method).toBe('DELETE');
  });

  it('lists notes newest first', async () => {
    const api = fakeApi({
      'GET /v1/clients/3/notes': [
        200,
        [
          { id: 1, note: 'old', createdOn: '2026-10-01T09:30:00Z' },
          { id: 3, note: 'undated' },
          { id: 2, note: 'new', createdOn: '2026-10-05T14:00:00Z' },
        ],
      ],
    });
    const notes = await new HttpClientKycApi(api.client).notes(3);
    expect(notes.map((n) => n.note)).toEqual(['new', 'old', 'undated']);
  });

  it('adds, updates and deletes a note with { note } bodies', async () => {
    const api = fakeApi({
      'POST /v1/clients/3/notes': [200, { clientId: 3, resourceId: 5 }],
      'PUT /v1/clients/3/notes/5': [200, { resourceId: 5 }],
      'DELETE /v1/clients/3/notes/5': [200, { resourceId: 5 }],
    });
    const http = new HttpClientKycApi(api.client);
    expect(await http.addNote(3, '  Visited  ')).toBe(5);
    await http.updateNote(3, 5, ' Revisited ');
    await http.deleteNote(3, 5);
    expect(api.requests.map((r) => [r.method, r.body])).toEqual([
      ['POST', { note: 'Visited' }],
      ['PUT', { note: 'Revisited' }],
      ['DELETE', null],
    ]);
  });
});
