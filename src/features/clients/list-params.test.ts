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

import { lastPage, readListParams, toListParams } from './list-params';

describe('client list params', () => {
  it('reads a one-based page and a trimmed search', () => {
    expect(readListParams({ page: '3', q: ' ada ' })).toEqual({ page: 2, search: 'ada' });
    expect(readListParams({})).toEqual({ page: 0, search: '' });
  });

  it.each(['0', '-2', '1.5', 'two', ''])('reads page %j as the first page', (page) => {
    expect(readListParams({ page }).page).toBe(0);
  });

  it('leaves defaults out of the URL', () => {
    expect(toListParams({ page: 0, search: '' })).toEqual({ page: undefined, q: undefined });
    expect(toListParams({ page: 2, search: 'ada' })).toEqual({ page: '3', q: 'ada' });
  });

  it('round-trips a position', () => {
    const position = { page: 4, search: 'grace' };
    expect(readListParams(toListParams(position))).toEqual(position);
  });

  it('finds the last page with rows', () => {
    expect(lastPage(54, 20)).toBe(2);
    expect(lastPage(40, 20)).toBe(1);
    expect(lastPage(0, 20)).toBe(0);
  });
});
