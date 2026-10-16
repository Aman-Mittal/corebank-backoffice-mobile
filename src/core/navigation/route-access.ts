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

import type { Access } from '@/core/auth/permissions';

import { isGroup, NAV_CATALOGUE, type NavEntry } from './nav-catalogue';

/**
 * Routes that are not navigation entries but declare their own requirement — the more specific
 * declaration wins over the module's (`/clients/new` needs CREATE_CLIENT, not READ_CLIENT).
 * Ported from the reference's route `data.permissions`; extended as each module's screens land.
 */
export const EXTRA_ROUTES: readonly NavEntry[] = [
  {
    id: 'clients.new',
    labelKey: 'ROUTES.CLIENTS_NEW',
    route: '/clients/new',
    access: { anyOf: ['CREATE_CLIENT'] },
    phase: 1,
  },
  {
    id: 'security.users.create',
    labelKey: 'ROUTES.USERS_CREATE',
    route: '/security/users/create',
    access: { anyOf: ['CREATE_USER'] },
    phase: 7,
  },
  {
    id: 'security.roles.create',
    labelKey: 'ROUTES.ROLES_CREATE',
    route: '/security/roles/create',
    access: { anyOf: ['CREATE_ROLE'] },
    phase: 7,
  },
];

export const NAV_ENTRIES: readonly NavEntry[] = NAV_CATALOGUE.flatMap((n) =>
  isGroup(n) ? n.children : [n],
);

const ALL_ROUTES = [...NAV_ENTRIES, ...EXTRA_ROUTES].toSorted(
  (a, b) => b.route.length - a.route.length,
);

/** `/clients/42/?tab=x` → `/clients/42`. */
export function normalisePath(path: string): string {
  const bare = path.split(/[?#]/, 1)[0] ?? '/';
  return bare.length > 1 ? bare.replace(/\/+$/, '') : bare;
}

/**
 * The declaration that governs a path: an exact match, else the nearest declared ancestor
 * (`/clients/42/edit` is governed by `/clients`). `null` for a path nothing declares.
 */
export function entryFor(path: string): NavEntry | null {
  const p = normalisePath(path);
  return ALL_ROUTES.find((e) => p === e.route || p.startsWith(`${e.route}/`)) ?? null;
}

/** What a path requires. Undeclared paths are ungated (they are not backoffice modules). */
export function accessFor(path: string): Access | null {
  return entryFor(path)?.access ?? null;
}
