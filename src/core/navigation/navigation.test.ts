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

import en from '@/i18n/locales/en.json';
import hi from '@/i18n/locales/hi.json';
import ko from '@/i18n/locales/ko.json';
import { permissionsSatisfy } from '@/core/auth/permissions';

import { isGroup, NAV_CATALOGUE } from './nav-catalogue';
import { accessFor, entryFor, EXTRA_ROUTES, NAV_ENTRIES, normalisePath } from './route-access';
import { visibleNav } from './visible-nav';

const lookup = (catalogue: object, key: string) =>
  key
    .split('.')
    .reduce<unknown>(
      (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
      catalogue,
    );

describe('route access', () => {
  it('matches exactly, and nested paths inherit the nearest declared ancestor', () => {
    expect(accessFor('/clients')).toEqual({ anyOf: ['READ_CLIENT'] });
    expect(accessFor('/clients/42/edit')).toEqual({ anyOf: ['READ_CLIENT'] });
    expect(accessFor('/transfers/standing-instructions/history')).toEqual({
      anyOf: ['READ_STANDINGINSTRUCTION'],
    });
  });

  it('lets a more specific declaration win', () => {
    expect(accessFor('/clients/new')).toEqual({ anyOf: ['CREATE_CLIENT'] });
    expect(accessFor('/security/roles/create')).toEqual({ anyOf: ['CREATE_ROLE'] });
  });

  it('does not let a sibling with a common prefix inherit', () => {
    expect(entryFor('/clientsfoo')).toBeNull();
  });

  it('leaves undeclared paths ungated', () => {
    expect(accessFor('/home')).toBeNull();
    expect(accessFor('/nowhere')).toBeNull();
  });

  it('ignores a trailing slash and a query string', () => {
    expect(normalisePath('/clients/?tab=x#y')).toBe('/clients');
    expect(normalisePath('/')).toBe('/');
    expect(accessFor('/security/users/')).toEqual({ anyOf: ['READ_USER'] });
  });
});

describe('visibleNav', () => {
  it('shows a clerk Clients, hides Security entirely, and keeps catalogue order', () => {
    const nav = visibleNav(['READ_CLIENT']);
    const ids = nav.map((n) => n.id);
    expect(ids).toContain('clients');
    expect(ids).not.toContain('security');
    expect(ids.indexOf('dashboard')).toBeLessThan(ids.indexOf('clients'));
    const tasks = nav.find((n) => n.id === 'tasks');
    expect(tasks && isGroup(tasks) ? tasks.children.map((c) => c.id) : []).toEqual([
      'tasks.work-queues',
    ]);
  });

  it('keeps ungated entries for a user with nothing', () => {
    const ids = visibleNav([]).map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['dashboard', 'profile']));
    expect(ids).not.toContain('clients');
  });

  it('shows a superuser everything', () => {
    expect(visibleNav(['ALL_FUNCTIONS'])).toHaveLength(NAV_CATALOGUE.length);
  });

  it('agrees with the route guard for every entry and any grant set (property)', () => {
    const code = fc.constantFrom(
      ...new Set(
        NAV_ENTRIES.flatMap((e) =>
          e.access ? ('anyOf' in e.access ? e.access.anyOf : e.access.allOf) : [],
        ),
      ),
      'ALL_FUNCTIONS_READ',
      'NOT_A_REAL_CODE',
    );
    fc.assert(
      fc.property(fc.array(code, { maxLength: 6 }), (granted) => {
        const shown = new Set(
          visibleNav(granted).flatMap((n) =>
            isGroup(n) ? n.children.map((c) => c.route) : [n.route],
          ),
        );
        for (const entry of NAV_ENTRIES) {
          expect(shown.has(entry.route)).toBe(permissionsSatisfy(granted, accessFor(entry.route)));
        }
      }),
    );
  });
});

describe('catalogue integrity', () => {
  const all = [...NAV_ENTRIES, ...EXTRA_ROUTES];

  it('has unique ids and unique absolute routes', () => {
    const ids = [...NAV_CATALOGUE.filter(isGroup).map((g) => g.id), ...all.map((e) => e.id)];
    expect(new Set(ids).size).toBe(ids.length);
    const routes = all.map((e) => e.route);
    expect(new Set(routes).size).toBe(routes.length);
    for (const r of routes) expect(r).toMatch(/^\/[a-z0-9/-]*$/);
  });

  it('has every label in every locale', () => {
    const keys = [...NAV_CATALOGUE.map((n) => n.labelKey), ...all.map((e) => e.labelKey)];
    for (const catalogue of [en, hi, ko]) {
      for (const key of keys) expect(typeof lookup(catalogue, key), key).toBe('string');
    }
  });

  it('uses upper-case permission codes and real phases', () => {
    for (const e of all) {
      if (e.access)
        for (const c of 'anyOf' in e.access ? e.access.anyOf : e.access.allOf)
          expect(c).toMatch(/^[A-Z_]+$/);
      expect(e.phase).toBeGreaterThanOrEqual(1);
      expect(e.phase).toBeLessThanOrEqual(9);
    }
  });
});
