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

import { clientFormSchema, emptyClientForm, toClientDraft } from './client-form';

const person = {
  ...emptyClientForm('2026-01-05'),
  officeId: 1,
  firstname: ' Mary ',
  lastname: 'Somerville',
};
const issues = (values: object) =>
  (clientFormSchema.safeParse(values).error?.issues ?? []).map(
    (i) => `${i.path.join('.')}:${i.message}`,
  );

describe('clientFormSchema', () => {
  it('accepts a person with an office and names, trimmed', () => {
    expect(issues(person)).toEqual([]);
    expect(clientFormSchema.parse(person).firstname).toBe('Mary');
  });

  it("requires the chosen legal form's names, and only those", () => {
    expect(issues({ ...person, lastname: '' })).toEqual(['lastname:FORM.REQUIRED']);
    expect(issues({ ...person, legalForm: 'entity' })).toEqual(['fullname:FORM.REQUIRED']);
    expect(
      issues({ ...person, legalForm: 'entity', firstname: '', lastname: '', fullname: 'Acme' }),
    ).toEqual([]);
  });

  it('requires an office', () => {
    expect(issues({ ...person, officeId: null })).toEqual(['officeId:FORM.REQUIRED']);
  });

  it('requires real dates, and an activation date only while active', () => {
    expect(issues({ ...person, submittedOnDate: '2026-02-30' })).toEqual([
      'submittedOnDate:FORM.DATE_INVALID',
    ]);
    expect(issues({ ...person, activationDate: '2026-13-01' })).toEqual([
      'activationDate:FORM.DATE_INVALID',
    ]);
    expect(issues({ ...person, active: false, activationDate: '' })).toEqual([]);
  });

  it('checks the mobile number and email shape', () => {
    expect(issues({ ...person, mobileNo: '07x2' })).toEqual(['mobileNo:FORM.DIGITS_ONLY']);
    expect(issues({ ...person, emailAddress: 'mary@' })).toEqual([
      'emailAddress:FORM.EMAIL_INVALID',
    ]);
  });
});

describe('toClientDraft', () => {
  it("keeps a person's names, nulls blank optionals, and the activation date while active", () => {
    expect(toClientDraft(clientFormSchema.parse({ ...person, fullname: 'ignored' }))).toEqual({
      legalForm: 'person',
      officeId: 1,
      firstname: 'Mary',
      middlename: null,
      lastname: 'Somerville',
      submittedOnDate: '2026-01-05',
      active: true,
      activationDate: '2026-01-05',
      externalId: null,
      mobileNo: null,
      emailAddress: null,
    });
  });

  it("keeps an entity's one name, and drops the activation date of an inactive client", () => {
    const draft = toClientDraft(
      clientFormSchema.parse({ ...person, legalForm: 'entity', fullname: 'Acme', active: false }),
    );
    expect(draft).toMatchObject({ legalForm: 'entity', fullname: 'Acme', active: false });
    expect(draft).not.toHaveProperty('firstname');
    expect(draft).not.toHaveProperty('activationDate');
  });
});
