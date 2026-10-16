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

import { AppError } from './app-error';
import { formFailure } from './field-errors';

const FIELDS = { name: 'name', mobileNo: 'mobile' } as const;

describe('formFailure', () => {
  it('places named messages under their fields, mapping server names to form names', () => {
    const error = new AppError('validation', 400, 'Validation errors exist.', [
      { field: 'mobileNo', message: 'must contain only digits' },
      { field: 'name', message: 'is mandatory' },
    ]);
    expect(formFailure(error, FIELDS, 'x')).toEqual({
      fields: { mobile: 'must contain only digits', name: 'is mandatory' },
      form: null,
    });
  });

  it('keeps a message for a field the form does not show, or for no field, at form level', () => {
    const error = new AppError('validation', 400, 'Validation errors exist.', [
      { field: 'hierarchy', message: 'cannot be changed' },
    ]);
    expect(formFailure(error, FIELDS, 'x')).toEqual({ fields: {}, form: 'cannot be changed' });
    const rule = new AppError('domainRule', 403, 'Office opening date is in the future', []);
    expect(formFailure(rule, FIELDS, 'x').form).toBe('Office opening date is in the future');
  });

  it('answers the fallback for anything that is not a server refusal', () => {
    expect(formFailure(new Error('bug'), FIELDS, 'Something went wrong')).toEqual({
      fields: {},
      form: 'Something went wrong',
    });
    expect(formFailure(new AppError('server', 500, null, []), FIELDS, 'fb').form).toBe('fb');
  });
});
