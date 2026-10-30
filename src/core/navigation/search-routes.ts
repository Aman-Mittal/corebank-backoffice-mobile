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

import { permissionsSatisfy } from '@/core/auth/permissions';

import type { NavEntry } from './nav-catalogue';
import { NAV_ENTRIES } from './route-access';

/** At most this many shortcuts, as the reference offers. */
export const MAX_SHORTCUTS = 8;

/**
 * The screens whose label, in the user's language, contains `query`, in navigation order, that
 * the grant set may open. A shortcut the user cannot follow would only disclose the screen.
 */
export function searchRoutes(
  query: string,
  label: (entry: NavEntry) => string,
  granted: Iterable<string>,
): NavEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === '') return [];
  const held = new Set(granted);
  return NAV_ENTRIES.filter(
    (e) =>
      label(e).toLocaleLowerCase().includes(needle) && permissionsSatisfy(held, e.access ?? null),
  ).slice(0, MAX_SHORTCUTS);
}
