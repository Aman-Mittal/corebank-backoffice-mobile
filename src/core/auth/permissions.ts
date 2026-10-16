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

/** The backend's superuser code: holding it satisfies every check. */
export const ALL_FUNCTIONS = 'ALL_FUNCTIONS';
/** Read-only superuser: satisfies a requirement made up entirely of `READ_*` codes. */
export const ALL_FUNCTIONS_READ = 'ALL_FUNCTIONS_READ';

/** What a route or control requires. `anyOf` is OR (the default everywhere); `allOf` is AND. */
export type Access = { readonly anyOf: readonly string[] } | { readonly allOf: readonly string[] };

export const codesOf = (access: Access): readonly string[] =>
  'anyOf' in access ? access.anyOf : access.allOf;

/**
 * Whether granted codes satisfy a requirement. `null` means ungated.
 *
 * The rule is fineract-backoffice-ui's `permissionsSatisfy` (Apache-2.0), kept identical so both
 * clients admit the same users: ALL_FUNCTIONS grants everything; ALL_FUNCTIONS_READ grants a
 * requirement made up entirely of READ_* codes and never a write; otherwise OR, or AND for
 * `allOf`. An empty requirement grants nothing rather than everything — a route that lists no
 * codes should say `null`, so a typo cannot open a screen.
 */
export function permissionsSatisfy(granted: Iterable<string>, access: Access | null): boolean {
  if (access === null) return true;
  const held = granted instanceof Set ? (granted as Set<string>) : new Set(granted);
  if (held.has(ALL_FUNCTIONS)) return true;
  const codes = codesOf(access);
  if (codes.length === 0) return false;
  if (held.has(ALL_FUNCTIONS_READ) && codes.every((c) => c.startsWith('READ_'))) return true;
  return 'allOf' in access ? codes.every((c) => held.has(c)) : codes.some((c) => held.has(c));
}
