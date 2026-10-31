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

import { breadcrumbTrail } from './breadcrumbs';
import type { NavEntry } from './nav-catalogue';
import { MAX_SHORTCUTS, searchRoutes } from './search-routes';

/** Labels as a user reads them: the last part of the key, in words. */
const label = (e: NavEntry) =>
  (e.labelKey.split('.').pop() ?? '').replaceAll('_', ' ').toLowerCase();

describe('searchRoutes', () => {
  it('matches labels case-insensitively, in navigation order', () => {
    const ids = searchRoutes('OFFICES', label, ['ALL_FUNCTIONS']).map((e) => e.id);
    expect(ids[0]).toBe('organization.offices');
  });

  it('offers only what the grant set permits', () => {
    expect(searchRoutes('users', label, ['READ_CLIENT']).map((e) => e.id)).not.toContain(
      'security.users',
    );
    expect(searchRoutes('clients', label, ['READ_CLIENT']).map((e) => e.id)).toContain('clients');
  });

  it('caps the shortcuts, and offers none for a blank query', () => {
    expect(searchRoutes('a', label, ['ALL_FUNCTIONS']).length).toBe(MAX_SHORTCUTS);
    expect(searchRoutes('  ', label, ['ALL_FUNCTIONS'])).toEqual([]);
  });
});

describe('breadcrumbTrail', () => {
  const trail = (path: string) => breadcrumbTrail(path).map((e) => e.route);

  it("has nothing above a module's own page", () => {
    expect(trail('/clients')).toEqual([]);
    expect(trail('/organization/offices')).toEqual([]);
    expect(trail('/home')).toEqual([]);
  });

  it('lists the declared routes above a nested path, outermost first', () => {
    expect(trail('/clients/new')).toEqual(['/clients']);
    expect(trail('/clients/1/charges?x=1')).toEqual(['/clients']);
    expect(trail('/organization/offices/new')).toEqual(['/organization/offices']);
  });
});
