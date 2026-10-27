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

import staff from '@/testing/fixtures/backend/staff.list.json';
import stackStaff from '@/testing/fixtures/backend/stack.staff.list.json';
import { fakeApi } from '@/testing/fake-api';

import { HttpStaffApi, mapStaff, type StaffPayload } from './http-staff.api';

describe('mapStaff (captured shape)', () => {
  it('maps names, office, flags and a string joining date', () => {
    const [director, grace] = (staff as StaffPayload[]).map(mapStaff);
    expect(director).toEqual({
      id: 1,
      firstname: 'Program',
      lastname: 'Director',
      displayName: 'Director, Program',
      officeId: 1,
      officeName: 'Head Office',
      externalId: null,
      mobileNo: '0700000001',
      emailAddress: null,
      isLoanOfficer: true,
      isActive: true,
      joiningDate: '2020-01-01',
    });
    expect(grace).toMatchObject({ isActive: false, emailAddress: 'grace@example.org' });
  });

  it('maps the list captured from the e2e stack', () => {
    expect((stackStaff as StaffPayload[]).map(mapStaff)).toEqual([
      expect.objectContaining({
        id: 1,
        displayName: 'Officer, Loan',
        officeName: 'Head Office',
        isLoanOfficer: true,
        isActive: true,
        joiningDate: '2026-01-02',
        mobileNo: null,
      }),
      expect.objectContaining({ id: 2, isLoanOfficer: false, joiningDate: '2026-01-05' }),
    ]);
  });

  it('accepts a [y, m, d] joining date and builds a display name when none is sent', () => {
    const s = mapStaff({
      id: 9,
      firstname: 'Ada',
      lastname: 'Lovelace',
      joiningDate: [2026, 1, 5],
    });
    expect(s.joiningDate).toBe('2026-01-05');
    expect(s.displayName).toBe('Lovelace, Ada');
    expect(mapStaff({ id: 9, lastname: 'Solo' }).displayName).toBe('Solo');
  });

  it('fails loudly on a staff member with no id', () => {
    expect(() => mapStaff({ firstname: 'x' })).toThrow(/no id/);
  });
});

describe('HttpStaffApi', () => {
  it('lists, passing only the filters given, and treats an empty body as none', async () => {
    const api = fakeApi({ 'GET /v1/staff': [200, staff] });
    const http = new HttpStaffApi(api.client);
    expect(await http.list()).toHaveLength(2);
    await http.list({ status: 'all', officeId: 2 });
    expect([...api.requests[0]!.query.keys()]).toEqual([]);
    expect(Object.fromEntries(api.requests[1]!.query)).toEqual({ status: 'all', officeId: '2' });
    const empty = new HttpStaffApi(fakeApi({ 'GET /v1/staff': [200, null] }).client);
    expect(await empty.list()).toEqual([]);
  });

  it('fails on a body that is not a list, rather than answering none', async () => {
    const http = new HttpStaffApi(fakeApi({ 'GET /v1/staff': [200, { unexpected: true }] }).client);
    await expect(http.list()).rejects.toThrow('GET /staff answered a body that is not a list');
  });

  it('gets one staff member', async () => {
    const http = new HttpStaffApi(fakeApi({ 'GET /v1/staff/2': [200, staff[1]] }).client);
    expect((await http.get(2)).displayName).toBe('Okello, Grace');
  });

  it('creates with the date format and locale, omits blank optionals, and answers the id', async () => {
    const api = fakeApi({ 'POST /v1/staff': [200, { officeId: 1, resourceId: 3 }] });
    const id = await new HttpStaffApi(api.client).create({
      officeId: 1,
      firstname: 'Ada',
      lastname: 'Lovelace',
      mobileNo: '',
      emailAddress: null,
      externalId: '  ',
      isLoanOfficer: false,
      isActive: true,
      joiningDate: '2026-01-05',
    });
    expect(id).toBe(3);
    expect(api.requests[0]!.body).toEqual({
      officeId: 1,
      firstname: 'Ada',
      lastname: 'Lovelace',
      isLoanOfficer: false,
      isActive: true,
      joiningDate: '2026-01-05',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('updates only the editable fields, omitting blanks', async () => {
    const api = fakeApi({ 'PUT /v1/staff/2': [200, { resourceId: 2 }] });
    await new HttpStaffApi(api.client).update(2, {
      firstname: 'Grace',
      lastname: 'Okello',
      mobileNo: '0772000000',
      externalId: '',
      isLoanOfficer: false,
      isActive: true,
    });
    expect(api.requests[0]!.body).toEqual({
      firstname: 'Grace',
      lastname: 'Okello',
      mobileNo: '0772000000',
      isLoanOfficer: false,
      isActive: true,
    });
  });

  it('rejects with an AppError carrying the field the server named', async () => {
    const api = fakeApi({
      'POST /v1/staff': [
        400,
        { errors: [{ parameterName: 'mobileNo', developerMessage: 'must contain only digits' }] },
      ],
    });
    const failure = await new HttpStaffApi(api.client)
      .create({
        officeId: 1,
        firstname: 'A',
        lastname: 'B',
        isLoanOfficer: false,
        isActive: true,
        joiningDate: '2026-01-05',
      })
      .catch((e: unknown) => e);
    expect(failure).toMatchObject({
      kind: 'validation',
      messages: [{ field: 'mobileNo', message: 'must contain only digits' }],
    });
  });
});
