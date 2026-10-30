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

import type { NavEntry } from './nav-catalogue';
import { EXTRA_ROUTES, NAV_ENTRIES, normalisePath } from './route-access';

const DECLARED = [...NAV_ENTRIES, ...EXTRA_ROUTES];

/**
 * The declared routes above `path`, outermost first: `/clients/new` → [Clients]. A module's own
 * page has none, and so shows no trail; the current screen's title ends the trail.
 */
export function breadcrumbTrail(path: string): NavEntry[] {
  const p = normalisePath(path);
  return DECLARED.filter((e) => p.startsWith(`${e.route}/`)).sort(
    (a, b) => a.route.length - b.route.length,
  );
}
