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

import { officeCreateSchema, officeFormSchema, toOfficeDraft } from './office-form';

const valid = { name: ' Jinja ', parentId: 2, openingDate: '2026-01-05', externalId: ' ' };

describe('office form', () => {
  it('trims, and turns a blank external id into null for the adapter', () => {
    const parsed = officeCreateSchema.parse(valid);
    expect(toOfficeDraft(parsed)).toEqual({
      name: 'Jinja',
      parentId: 2,
      openingDate: '2026-01-05',
      externalId: null,
    });
  });

  it('requires a name and a real date, with i18n keys as messages', () => {
    const r = officeFormSchema.safeParse({ ...valid, name: '  ', openingDate: '2026-02-30' });
    expect(r.success).toBe(false);
    const messages = Object.fromEntries(r.error!.issues.map((i) => [i.path[0], i.message]));
    expect(messages).toEqual({ name: 'FORM.REQUIRED', openingDate: 'FORM.DATE_INVALID' });
  });

  it('needs a parent to create, not to edit', () => {
    expect(officeCreateSchema.safeParse({ ...valid, parentId: null }).success).toBe(false);
    expect(officeFormSchema.safeParse({ ...valid, parentId: null }).success).toBe(true);
  });
});
