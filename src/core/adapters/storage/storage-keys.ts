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

/**
 * How long a stored value survives.
 *
 * `session` lasts until the app process (native) or the browser tab (web) ends; `device`
 * survives restarts. The names describe the lifetime a caller wants, not the API that provides
 * it, so a caller is choosing "until this session ends" rather than choosing `sessionStorage`.
 */
export type StorageScope = 'session' | 'device';

/**
 * Every key this application stores, and its scope.
 *
 * Enumerating them is the point (carried over from fineract-backoffice-ui, `storage-keys.ts`): a
 * trust boundary nobody can list is one nobody can review, and a closed set is what makes
 * `clearScope` possible and an unlisted key a compile error.
 *
 * Credentials are not here. The session token and the two-factor token live in SECURE_STORAGE,
 * which is backed by the platform keystore on native.
 */
export const STORAGE_KEYS = {
  /** The active tenant identifier. */
  tenant: { key: 'mbo_tenant', scope: 'device' },
  /** The user's server override. See `core/config/runtime-config.ts`. */
  runtimeConfig: { key: 'mbo_runtime_config', scope: 'device' },
  /** Light, dark or system theme. */
  theme: { key: 'mbo_theme', scope: 'device' },
  /** The UI language the user picked, overriding the device locale. */
  language: { key: 'mbo_language', scope: 'device' },
  /** Persisted reference-data query cache (non-sensitive, see DOCS/OFFLINE.md). */
  queryCache: { key: 'mbo_query_cache', scope: 'device' },
  /** Non-secret profile of the signed-in user, for showing the shell before revalidation. */
  profile: { key: 'mbo_profile', scope: 'session' },
} as const satisfies Record<string, { key: string; scope: StorageScope }>;

export type StorageKey = keyof typeof STORAGE_KEYS;
