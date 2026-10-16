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

import { toIsoApiDate, withoutBlanks } from './api-date';

describe('toIsoApiDate', () => {
  it.each([
    [[2009, 1, 1], '2009-01-01'],
    [[2026, 10, 2], '2026-10-02'],
    ['2026-10-02', '2026-10-02'],
    ['2026-10-02T13:45:00+05:30', '2026-10-02'],
    ['', null],
    [null, null],
    [undefined, null],
    [[2026, 13, 1], null],
    [[2026, 0, 1], null],
    [[2026, 1], null],
    ['not a date', null],
  ] as const)('%j → %j', (input, expected) => {
    expect(toIsoApiDate(input as never)).toBe(expected);
  });

  it('round-trips every valid [y, m, d] through the string form (month is 1-based)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 2200 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        (y, m, d) => {
          const iso = toIsoApiDate([y, m, d]);
          expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(toIsoApiDate(iso)).toBe(iso);
          const [ys, ms, ds] = (iso as string).split('-').map(Number);
          expect([ys, ms, ds]).toEqual([y, m, d]);
        },
      ),
    );
  });
});

describe('withoutBlanks', () => {
  it('omits the key entirely, not just its value', () => {
    const out = withoutBlanks({
      name: 'a',
      mobileNo: '',
      email: '  ',
      staffId: null,
      x: undefined,
      n: 0,
    });
    expect(out).toEqual({ name: 'a', n: 0 });
    expect('mobileNo' in out).toBe(false);
  });
});
