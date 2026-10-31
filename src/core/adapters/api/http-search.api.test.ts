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

import stackSearch from '@/testing/fixtures/backend/stack.search.json';
import { fakeApi } from '@/testing/fake-api';

import { HttpSearchApi, mapSearchHit } from './http-search.api';

describe('mapSearchHit', () => {
  it('maps the captured clients with their account number and office', () => {
    expect(stackSearch.map(mapSearchHit)[1]).toEqual({
      id: 14,
      type: 'client',
      name: 'Charge Capture',
      accountNo: '000000014',
      officeName: 'Head Office',
    });
  });

  it('knows loans and savings accounts, and drops what the app cannot open', () => {
    expect(mapSearchHit({ entityId: 22, entityType: 'LOAN', entityName: 'L' })).toMatchObject({
      type: 'loan',
      accountNo: null,
      officeName: null,
    });
    expect(mapSearchHit({ entityId: 33, entityType: 'SAVINGSACCOUNT' })?.type).toBe('savings');
    expect(mapSearchHit({ entityId: 44, entityType: 'GROUP' })).toBeNull();
    expect(() => mapSearchHit({ entityType: 'CLIENT' })).toThrow(/no id/);
  });
});

describe('HttpSearchApi', () => {
  it('asks for clients, loans and savings, and treats an empty body as none', async () => {
    const api = fakeApi({ 'GET /v1/search': [200, stackSearch] });
    const hits = await new HttpSearchApi(api.client).search('Capture');
    expect(hits.map((h) => h.id)).toEqual([15, 14, 24]);
    expect(Object.fromEntries(api.requests[0]!.query)).toEqual({
      query: 'Capture',
      resource: 'clients,loans,savings',
    });
    const none = fakeApi({ 'GET /v1/search': [200, null] });
    expect(await new HttpSearchApi(none.client).search('Zz')).toEqual([]);
  });
});
