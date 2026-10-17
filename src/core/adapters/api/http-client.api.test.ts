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

import one from '@/testing/fixtures/backend/client.one.json';
import page from '@/testing/fixtures/backend/clients.page.json';
import { fakeApi } from '@/testing/fake-api';

import { clientStatus, HttpClientApi, mapClient, type ClientPayload } from './http-client.api';

describe('mapClient (captured shape)', () => {
  it('maps a list row, with its legal form, status code and [y, m, d] dates', () => {
    const [arif] = (page.pageItems as ClientPayload[]).map(mapClient);
    expect(arif).toEqual({
      id: 3,
      accountNo: '000000003',
      displayName: 'Arif Arif',
      firstname: 'Arif',
      middlename: null,
      lastname: 'Arif',
      fullname: null,
      legalForm: 'person',
      status: 'active',
      statusLabel: 'Active',
      officeId: 1,
      officeName: 'Head Office',
      externalId: '01a148c2-d5c8-770c-9c90-3f0009fa185a',
      mobileNo: null,
      emailAddress: null,
      submittedOnDate: '2026-10-17',
      activationDate: '2026-10-17',
    });
  });

  it('maps a single client the same way', () => {
    expect(mapClient(one as ClientPayload)).toMatchObject({
      id: 3,
      legalForm: 'person',
      status: 'active',
      activationDate: '2026-10-17',
    });
  });

  it('maps an entity, and builds a display name when none is sent', () => {
    const entity = mapClient({
      id: 9,
      fullname: 'Acme Traders Ltd',
      legalForm: { id: 2, code: 'legalFormType.entity', value: 'Entity' },
    });
    expect(entity).toMatchObject({ legalForm: 'entity', displayName: 'Acme Traders Ltd' });
    expect(mapClient({ id: 9, firstname: 'Ada', lastname: 'Lovelace' }).displayName).toBe(
      'Ada Lovelace',
    );
    expect(mapClient({ id: 9 })).toMatchObject({ legalForm: null, status: 'unknown' });
  });

  it('fails loudly on a client with no id', () => {
    expect(() => mapClient({ displayName: 'x' })).toThrow(/no id/);
  });
});

describe('clientStatus', () => {
  it.each([
    ['clientStatusType.pending', 'pending'],
    ['clientStatusType.active', 'active'],
    ['clientStatusType.transfer.in.progress', 'transferInProgress'],
    ['clientStatusType.transfer.on.hold', 'transferOnHold'],
    ['clientStatusType.closed', 'closed'],
    ['clientStatusType.rejected', 'rejected'],
    ['clientStatusType.withdraw', 'withdrawn'],
    ['clientStatusType.invalid', 'unknown'],
    [undefined, 'unknown'],
  ])('%s → %s', (code, status) => {
    expect(clientStatus(code)).toBe(status);
  });
});

describe('HttpClientApi', () => {
  it('lists a page by display name, without a legal form filter, and answers the total', async () => {
    const api = fakeApi({ 'GET /v1/clients': [200, page] });
    const http = new HttpClientApi(api.client);
    const first = await http.list({ offset: 0, limit: 20 });
    expect(first.total).toBe(3);
    expect(first.items.map((c) => c.id)).toEqual([3, 1, 2]);
    await http.list({ search: ' ada ', offset: 20, limit: 20 });
    expect(Object.fromEntries(api.requests[0]!.query)).toEqual({
      offset: '0',
      limit: '20',
      orderBy: 'displayName',
      sortOrder: 'ASC',
    });
    expect(Object.fromEntries(api.requests[1]!.query)).toMatchObject({
      displayName: 'ada',
      offset: '20',
    });
    const empty = new HttpClientApi(fakeApi({ 'GET /v1/clients': [200, null] }).client);
    expect(await empty.list({ offset: 0, limit: 20 })).toEqual({ total: 0, items: [] });
  });

  it('gets one client', async () => {
    const http = new HttpClientApi(fakeApi({ 'GET /v1/clients/3': [200, one] }).client);
    expect((await http.get(3)).displayName).toBe('Arif Arif');
  });

  it("creates a person with only a person's names and no blanks, and answers the id", async () => {
    const api = fakeApi({
      'POST /v1/clients': [200, { officeId: 1, clientId: 13, resourceId: 13 }],
    });
    const id = await new HttpClientApi(api.client).create({
      legalForm: 'person',
      officeId: 1,
      firstname: 'Mary',
      middlename: null,
      lastname: 'Somerville',
      externalId: ' ',
      mobileNo: null,
      emailAddress: 'mary@example.org',
      submittedOnDate: '2026-01-05',
      active: true,
      activationDate: '2026-01-06',
    });
    expect(id).toBe(13);
    expect(api.requests[0]!.body).toEqual({
      legalFormId: 1,
      officeId: 1,
      firstname: 'Mary',
      lastname: 'Somerville',
      emailAddress: 'mary@example.org',
      submittedOnDate: '2026-01-05',
      active: true,
      activationDate: '2026-01-06',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('creates an inactive entity with its one name and no activation date', async () => {
    const api = fakeApi({ 'POST /v1/clients': [200, { clientId: 14, resourceId: 14 }] });
    await new HttpClientApi(api.client).create({
      legalForm: 'entity',
      officeId: 2,
      fullname: 'Nile Cooperative',
      submittedOnDate: '2026-01-05',
      active: false,
    });
    expect(api.requests[0]!.body).toEqual({
      legalFormId: 2,
      officeId: 2,
      fullname: 'Nile Cooperative',
      submittedOnDate: '2026-01-05',
      active: false,
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('activates with the command and the date', async () => {
    const api = fakeApi({ 'POST /v1/clients/3': [200, { clientId: 3, resourceId: 3 }] });
    await new HttpClientApi(api.client).activate(3, '2026-01-07');
    expect(Object.fromEntries(api.requests[0]!.query)).toEqual({ command: 'activate' });
    expect(api.requests[0]!.body).toEqual({
      activationDate: '2026-01-07',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('rejects with an AppError carrying the field the server named', async () => {
    const api = fakeApi({
      'POST /v1/clients': [
        400,
        { errors: [{ parameterName: 'externalId', developerMessage: 'already exists' }] },
      ],
    });
    const failure = await new HttpClientApi(api.client)
      .create({
        legalForm: 'entity',
        officeId: 1,
        fullname: 'X',
        submittedOnDate: '2026-01-05',
        active: false,
      })
      .catch((e: unknown) => e);
    expect(failure).toMatchObject({
      kind: 'validation',
      messages: [{ field: 'externalId', message: 'already exists' }],
    });
  });
});
