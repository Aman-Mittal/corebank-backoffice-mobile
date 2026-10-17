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
import sandboxTemplate from '@/testing/fixtures/backend/client.template.reject.json';
import { fakeApi } from '@/testing/fake-api';

import {
  clientStatus,
  commandBody,
  HttpClientApi,
  mapClient,
  type ClientPayload,
} from './http-client.api';

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
      closedOnDate: null,
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

  it('reads the closure date from the timeline', () => {
    const closed = mapClient({ id: 5, timeline: { closedOnDate: [2026, 9, 30] } });
    expect(closed.closedOnDate).toBe('2026-09-30');
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
    await new HttpClientApi(api.client).command(3, 'activate', { date: '2026-01-07' });
    expect(Object.fromEntries(api.requests[0]!.query)).toEqual({ command: 'activate' });
    expect(api.requests[0]!.body).toEqual({
      activationDate: '2026-01-07',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('posts a reasoned command with its reason', async () => {
    const api = fakeApi({ 'POST /v1/clients/1': [200, { clientId: 1, resourceId: 1 }] });
    await new HttpClientApi(api.client).command(1, 'close', { date: '2026-10-02', reasonId: 51 });
    expect(Object.fromEntries(api.requests[0]!.query)).toEqual({ command: 'close' });
    expect(api.requests[0]!.body).toEqual({
      closureDate: '2026-10-02',
      closureReasonId: 51,
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it.each([
    ['activate', { activationDate: 'D' }],
    ['reject', { rejectionDate: 'D', rejectionReasonId: 9 }],
    ['withdraw', { withdrawalDate: 'D', withdrawalReasonId: 9 }],
    ['close', { closureDate: 'D', closureReasonId: 9 }],
    ['reactivate', { reactivationDate: 'D' }],
    ['undoRejection', { reopenedDate: 'D' }],
    ['undoWithdrawal', { reopenedDate: 'D' }],
  ] as const)('%s sends %o', (command, fields) => {
    expect(commandBody(command, { date: 'D', reasonId: 9 })).toEqual({
      ...fields,
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('reads reasons from the command template, active ones in order', async () => {
    const api = fakeApi({
      'GET /v1/clients/template': [
        200,
        {
          isStaff: false,
          narrations: [
            { id: 52, name: 'Deceased', position: 2, active: true, mandatory: false },
            { id: 53, name: 'Retired', position: 3, active: false, mandatory: false },
            { id: 51, name: 'Relocated', position: 1, active: true, mandatory: false },
          ],
        },
      ],
    });
    const reasons = await new HttpClientApi(api.client).reasons('close');
    expect(Object.fromEntries(api.requests[0]!.query)).toEqual({ commandParam: 'close' });
    expect(reasons).toEqual([
      { id: 51, name: 'Relocated' },
      { id: 52, name: 'Deceased' },
    ]);
  });

  it('answers no reasons for the captured sandbox template, which has none', async () => {
    const api = fakeApi({ 'GET /v1/clients/template': [200, sandboxTemplate] });
    expect(await new HttpClientApi(api.client).reasons('reject')).toEqual([]);
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
