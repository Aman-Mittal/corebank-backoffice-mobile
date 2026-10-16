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

import offices from '@/testing/fixtures/backend/offices.list.json';
import { fakeApi } from '@/testing/fake-api';

import { HttpOfficeApi, mapOffice, type OfficePayload } from './http-office.api';

describe('mapOffice (captured payloads)', () => {
  it('converts the [y, m, d] opening date and reads the undeclared parent fields', () => {
    const [head, branch] = (offices as OfficePayload[]).map(mapOffice);
    expect(head).toEqual({
      id: 1,
      name: 'Head Office',
      nameDecorated: 'Head Office',
      externalId: '1',
      hierarchy: '.',
      parentId: null,
      parentName: null,
      openingDate: '2009-01-01',
    });
    expect(branch).toMatchObject({
      id: 2,
      parentId: 1,
      parentName: 'Head Office',
      openingDate: '2026-10-02',
    });
  });

  it('fails loudly on an office with no id rather than routing somewhere wrong', () => {
    expect(() => mapOffice({ name: 'x' })).toThrow(/no id/);
  });

  it('falls back to the plain name when there is no decorated one', () => {
    expect(mapOffice({ id: 3, name: 'Gulu' }).nameDecorated).toBe('Gulu');
  });
});

describe('HttpOfficeApi', () => {
  it('lists, passing includeAllOffices only when asked', async () => {
    const api = fakeApi({ 'GET /v1/offices': [200, offices] });
    const http = new HttpOfficeApi(api.client);
    expect(await http.list()).toHaveLength(2);
    await http.list(true);
    expect(api.requests[0]!.query.has('includeAllOffices')).toBe(false);
    expect(api.requests[1]!.query.get('includeAllOffices')).toBe('true');
  });

  it('answers an empty list for an empty body', async () => {
    const http = new HttpOfficeApi(fakeApi({ 'GET /v1/offices': [200, null] }).client);
    expect(await http.list()).toEqual([]);
  });

  it('gets one office', async () => {
    const http = new HttpOfficeApi(fakeApi({ 'GET /v1/offices/2': [200, offices[1]] }).client);
    expect((await http.get(2)).openingDate).toBe('2026-10-02');
  });

  it('creates with the date format and locale, omits a blank parent, and answers the new id', async () => {
    const api = fakeApi({ 'POST /v1/offices': [200, { officeId: 7, resourceId: 7 }] });
    const id = await new HttpOfficeApi(api.client).create({
      name: 'Gulu',
      openingDate: '2026-10-02',
      parentId: null,
    });
    expect(id).toBe(7);
    expect(api.requests[0]!.body).toEqual({
      name: 'Gulu',
      openingDate: '2026-10-02',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('updates without a parent', async () => {
    const api = fakeApi({ 'PUT /v1/offices/2': [200, { resourceId: 2 }] });
    await new HttpOfficeApi(api.client).update(2, {
      name: 'Kampala',
      externalId: 'K1',
      openingDate: '2026-10-03',
    });
    expect(api.requests[0]!.body).toEqual({
      name: 'Kampala',
      externalId: 'K1',
      openingDate: '2026-10-03',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('rejects with an AppError on failure', async () => {
    const http = new HttpOfficeApi(
      fakeApi({ 'GET /v1/offices/9': [404, { developerMessage: 'not found' }] }).client,
    );
    await expect(http.get(9)).rejects.toMatchObject({ kind: 'notFound' });
  });
});
