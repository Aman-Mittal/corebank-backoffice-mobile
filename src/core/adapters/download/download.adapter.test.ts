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

import { DEFAULT_FILENAME, MAX_FILENAME_LENGTH, sanitiseFilename } from './download.adapter';

describe('sanitiseFilename', () => {
  it.each([
    ['../../etc/passwd', 'passwd'],
    [String.raw`C:\Users\x\report.csv`, 'report.csv'],
    ['Client Statement 2026.pdf', 'Client Statement 2026.pdf'],
    ['.hidden', 'hidden'],
    ['-rf.txt', 'rf.txt'],
    ['a:b*c?.csv', 'a_b_c_.csv'],
    ['', DEFAULT_FILENAME],
    ['///', DEFAULT_FILENAME],
  ])('%j → %j', (input, expected) => {
    expect(sanitiseFilename(input)).toBe(expected);
  });

  it('keeps the extension when truncating', () => {
    const out = sanitiseFilename(`${'x'.repeat(400)}.xlsx`);
    expect(out).toHaveLength(MAX_FILENAME_LENGTH);
    expect(out.endsWith('.xlsx')).toBe(true);
  });

  it('never yields a separator, a control character, an empty or over-long name', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 600 }), (name) => {
        const out = sanitiseFilename(name);
        expect(out.length).toBeGreaterThan(0);
        expect(out.length).toBeLessThanOrEqual(MAX_FILENAME_LENGTH);
        // eslint-disable-next-line no-control-regex -- asserting their absence
        expect(out).not.toMatch(/[/\\:*?"<>|\u0000-\u001F]/);
        expect(out).not.toMatch(/^[.\-\s]/);
      }),
    );
  });
});
