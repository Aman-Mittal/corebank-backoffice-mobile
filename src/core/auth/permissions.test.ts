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

import fc from 'fast-check';

import { ALL_FUNCTIONS, ALL_FUNCTIONS_READ, permissionsSatisfy } from './permissions';

describe('permissionsSatisfy', () => {
  it('admits anything for an ungated requirement', () => {
    expect(permissionsSatisfy([], null)).toBe(true);
  });

  it('lets ALL_FUNCTIONS satisfy every requirement', () => {
    expect(permissionsSatisfy([ALL_FUNCTIONS], { allOf: ['CREATE_CLIENT', 'DELETE_LOAN'] })).toBe(
      true,
    );
  });

  it('lets ALL_FUNCTIONS_READ satisfy only an all-READ requirement', () => {
    expect(permissionsSatisfy([ALL_FUNCTIONS_READ], { anyOf: ['READ_CLIENT'] })).toBe(true);
    expect(permissionsSatisfy([ALL_FUNCTIONS_READ], { allOf: ['READ_CLIENT', 'READ_LOAN'] })).toBe(
      true,
    );
    expect(permissionsSatisfy([ALL_FUNCTIONS_READ], { anyOf: ['CREATE_CLIENT'] })).toBe(false);
    expect(
      permissionsSatisfy([ALL_FUNCTIONS_READ], { anyOf: ['READ_CLIENT', 'CREATE_CLIENT'] }),
    ).toBe(false);
  });

  it('a mixed requirement falls through to the plain check for ALL_FUNCTIONS_READ', () => {
    expect(
      permissionsSatisfy([ALL_FUNCTIONS_READ, 'CREATE_CLIENT'], {
        anyOf: ['READ_CLIENT', 'CREATE_CLIENT'],
      }),
    ).toBe(true);
  });

  it('is OR for anyOf and AND for allOf', () => {
    expect(permissionsSatisfy(['READ_LOAN'], { anyOf: ['READ_LOAN', 'READ_CLIENT'] })).toBe(true);
    expect(permissionsSatisfy(['READ_LOAN'], { allOf: ['READ_LOAN', 'READ_CLIENT'] })).toBe(false);
    expect(
      permissionsSatisfy(['READ_LOAN', 'READ_CLIENT'], { allOf: ['READ_LOAN', 'READ_CLIENT'] }),
    ).toBe(true);
  });

  it('grants nothing gated to an empty or unrecognised grant set', () => {
    expect(permissionsSatisfy([], { anyOf: ['READ_CLIENT'] })).toBe(false);
    expect(permissionsSatisfy(['NOT_A_REAL_CODE'], { anyOf: ['READ_CLIENT'] })).toBe(false);
  });

  it('treats an empty requirement as refusing, not admitting', () => {
    expect(permissionsSatisfy(['READ_CLIENT'], { anyOf: [] })).toBe(false);
  });

  it('never loses access when a code is added (monotonic)', () => {
    const code = fc.constantFrom(
      'READ_CLIENT',
      'CREATE_CLIENT',
      'READ_LOAN',
      'READ_USER',
      ALL_FUNCTIONS_READ,
      ALL_FUNCTIONS,
      'X',
    );
    fc.assert(
      fc.property(
        fc.array(code),
        code,
        fc.array(code, { minLength: 1 }),
        fc.boolean(),
        (held, extra, req, all) => {
          const access = all ? { allOf: req } : { anyOf: req };
          if (permissionsSatisfy(held, access))
            expect(permissionsSatisfy([...held, extra], access)).toBe(true);
        },
      ),
    );
  });
});
