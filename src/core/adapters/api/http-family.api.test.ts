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

import stackMembers from '@/testing/fixtures/backend/stack.client.familymembers.json';
import template from '@/testing/fixtures/backend/stack.client.familymembers.template.json';
import { fakeApi } from '@/testing/fake-api';

import type { FamilyMemberDraft } from './family.api';
import { HttpFamilyApi, mapFamilyMember } from './http-family.api';

const TOM: FamilyMemberDraft = {
  firstName: ' Tom ',
  middleName: '',
  lastName: 'Capture',
  relationshipId: 27,
  genderId: null,
  maritalStatusId: null,
  professionId: null,
  qualification: '',
  mobileNumber: '',
  age: null,
  dateOfBirth: null,
  isDependent: true,
};

describe('payloads captured from the e2e stack', () => {
  it('maps a member with every field, and one whose choices are 0', () => {
    expect(stackMembers.map(mapFamilyMember)).toEqual([
      {
        id: 7,
        firstName: 'Mary',
        middleName: 'Ann',
        lastName: 'Capture',
        relationshipId: 26,
        relationship: 'Spouse',
        genderId: 28,
        gender: 'Female',
        maritalStatusId: 29,
        maritalStatus: 'Married',
        professionId: 30,
        profession: 'Teacher',
        qualification: 'MSc',
        mobileNumber: '5550101',
        age: 34,
        dateOfBirth: '1992-04-03',
        isDependent: false,
      },
      {
        id: 8,
        firstName: 'Tom',
        middleName: null,
        lastName: 'Capture',
        relationshipId: 27,
        relationship: 'Son',
        genderId: null,
        gender: null,
        maritalStatusId: null,
        maritalStatus: null,
        professionId: null,
        profession: null,
        qualification: null,
        mobileNumber: null,
        age: null,
        dateOfBirth: null,
        isDependent: true,
      },
    ]);
  });

  it('fails loudly on a member with no id', () => {
    expect(() => mapFamilyMember({ firstName: 'x' })).toThrow(/no id/);
  });
});

describe('HttpFamilyApi', () => {
  it("reads the template's four option lists", async () => {
    const api = fakeApi({ 'GET /v1/clients/24/familymembers/template': [200, template] });
    expect(await new HttpFamilyApi(api.client).options(24)).toEqual({
      relationships: [
        { id: 26, name: 'Spouse' },
        { id: 27, name: 'Son' },
      ],
      genders: [{ id: 28, name: 'Female' }],
      maritalStatuses: [{ id: 29, name: 'Married' }],
      professions: [{ id: 30, name: 'Teacher' }],
    });
  });

  it('lists members, treating an empty body as none', async () => {
    const api = fakeApi({ 'GET /v1/clients/24/familymembers': [200, null] });
    expect(await new HttpFamilyApi(api.client).members(24)).toEqual([]);
  });

  it('adds with only the fields given, and the date of birth with its format', async () => {
    const api = fakeApi({ 'POST /v1/clients/24/familymembers': [200, { resourceId: 9 }] });
    const http = new HttpFamilyApi(api.client);
    expect(await http.add(24, TOM)).toBe(9);
    await http.add(24, { ...TOM, genderId: 28, age: 9, dateOfBirth: '2017-02-01' });
    expect(api.requests.map((r) => r.body)).toEqual([
      { firstName: 'Tom', lastName: 'Capture', relationshipId: 27, isDependent: true },
      {
        firstName: 'Tom',
        lastName: 'Capture',
        age: 9,
        dateOfBirth: '2017-02-01',
        dateFormat: 'yyyy-MM-dd',
        locale: 'en',
        relationshipId: 27,
        genderId: 28,
        isDependent: true,
      },
    ]);
  });

  it('edits with every field, sending 0 for each choice not made', async () => {
    const api = fakeApi({ 'PUT /v1/clients/24/familymembers/8': [200, { resourceId: 8 }] });
    await new HttpFamilyApi(api.client).update(24, 8, { ...TOM, lastName: 'Captured' });
    expect(api.requests[0]!.body).toEqual({
      firstName: 'Tom',
      lastName: 'Captured',
      relationshipId: 27,
      genderId: 0,
      maritalStatusId: 0,
      professionId: 0,
      isDependent: true,
    });
  });

  it('deletes a member by its path', async () => {
    const api = fakeApi({ 'DELETE /v1/clients/24/familymembers/8': [200, { resourceId: 8 }] });
    await new HttpFamilyApi(api.client).remove(24, 8);
    expect(api.requests[0]!.method).toBe('DELETE');
  });
});
