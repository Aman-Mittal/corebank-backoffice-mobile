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

import { isGroup, NAV_CATALOGUE, type NavNode } from './nav-catalogue';
import { accessFor } from './route-access';

/**
 * The navigation a user may see: entries their permissions admit, groups that still have an
 * entry, catalogue order kept. An entry is decided by `accessFor(entry.route)` — the same function
 * the route guard uses — so a shown entry is always admitted and a hidden one always refused.
 */
export function visibleNav(granted: Iterable<string>): NavNode[] {
  const held = new Set(granted);
  const admits = (route: string) => permissionsSatisfy(held, accessFor(route));
  const out: NavNode[] = [];
  for (const node of NAV_CATALOGUE) {
    if (isGroup(node)) {
      const children = node.children.filter((c) => admits(c.route));
      if (children.length > 0) out.push({ ...node, children });
    } else if (admits(node.route)) {
      out.push(node);
    }
  }
  return out;
}
