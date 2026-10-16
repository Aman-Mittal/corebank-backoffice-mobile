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

import { isRealIsoDate, todayIso } from './date';

describe('isRealIsoDate', () => {
  it.each([
    ['2026-01-05', true],
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-1-5', false],
    ['05/01/2026', false],
    ['', false],
  ])('%s → %s', (value, expected) => expect(isRealIsoDate(value)).toBe(expected));

  it('accepts every day a Date can name, formatted as ISO (property)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1900-01-01'), max: new Date('2199-12-31'), noInvalidDate: true }),
        (d) => {
          expect(isRealIsoDate(d.toISOString().slice(0, 10))).toBe(true);
        },
      ),
    );
  });
});

describe('todayIso', () => {
  it('formats the local calendar day, zero-padded', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 30).getTime())).toBe('2026-01-05');
  });
});
