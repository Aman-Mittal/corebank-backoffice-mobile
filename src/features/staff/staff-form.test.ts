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

import { staffFormSchema, toStaffDraft, toStaffUpdate } from './staff-form';

const valid = {
  officeId: 1,
  firstname: ' Ada ',
  lastname: 'Lovelace',
  mobileNo: '',
  emailAddress: '',
  externalId: '',
  joiningDate: '2026-01-05',
  isLoanOfficer: false,
  isActive: true,
};

const messages = (input: object) => {
  const r = staffFormSchema.safeParse({ ...valid, ...input });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

describe('staff form', () => {
  it('produces the draft and the update the adapter expects', () => {
    const parsed = staffFormSchema.parse({ ...valid, mobileNo: '0772000000' });
    expect(toStaffDraft(parsed)).toEqual({
      officeId: 1,
      firstname: 'Ada',
      lastname: 'Lovelace',
      mobileNo: '0772000000',
      emailAddress: null,
      externalId: null,
      isLoanOfficer: false,
      isActive: true,
      joiningDate: '2026-01-05',
    });
    expect(toStaffUpdate(parsed)).toEqual({
      firstname: 'Ada',
      lastname: 'Lovelace',
      mobileNo: '0772000000',
      externalId: null,
      isLoanOfficer: false,
      isActive: true,
    });
  });

  it('says why each field is refused, with i18n keys', () => {
    expect(
      messages({
        officeId: null,
        firstname: ' ',
        mobileNo: '07x',
        emailAddress: 'a@',
        joiningDate: '2026-13-01',
      }),
    ).toEqual({
      officeId: 'FORM.REQUIRED',
      firstname: 'FORM.REQUIRED',
      mobileNo: 'FORM.DIGITS_ONLY',
      emailAddress: 'FORM.EMAIL_INVALID',
      joiningDate: 'FORM.DATE_INVALID',
    });
    expect(messages({ emailAddress: 'ada@example.org', mobileNo: '0772' })).toEqual({});
  });
});
