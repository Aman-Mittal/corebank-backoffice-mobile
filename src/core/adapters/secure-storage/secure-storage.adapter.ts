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

import { token } from '../registry';

/**
 * Where credentials live: the session token and the two-factor token.
 *
 * Kept apart from STORAGE on purpose. On native it is the platform keystore (Keychain / Android
 * Keystore); on web it is tab-scoped `sessionStorage`, so a credential never outlives the tab,
 * which is the same rule fineract-backoffice-ui applies to its `session` key.
 *
 * Asynchronous because the keystore is. Like STORAGE, it never throws: a failed read is "no
 * credential", which sends the user to sign in rather than to a crash.
 */
export const SECURE_KEYS = {
  session: 'cbo_session',
  tfaToken: 'cbo_tfa_token',
} as const;

export type SecureKey = keyof typeof SECURE_KEYS;

export interface SecureStorageAdapter {
  get(key: SecureKey): Promise<string | null>;
  set(key: SecureKey, value: string): Promise<void>;
  remove(key: SecureKey): Promise<void>;
  /** Removes every credential. What sign-out calls. */
  clear(): Promise<void>;
}

export const SECURE_STORAGE = token<SecureStorageAdapter>('SecureStorageAdapter');

/** The operations a platform keystore must provide. */
export interface SecureBackend {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
}

export function createSecureStorage(backend: SecureBackend): SecureStorageAdapter {
  const remove = async (key: SecureKey) => {
    try {
      await backend.removeItem(SECURE_KEYS[key]);
    } catch {
      /* already unreachable, so already gone as far as this app can tell */
    }
  };
  return {
    async get(key) {
      try {
        return (await backend.getItem(SECURE_KEYS[key])) ?? null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        await backend.setItem(SECURE_KEYS[key], value);
      } catch {
        // The credential stays in memory for this run; it just will not survive a restart.
      }
    },
    remove,
    async clear() {
      await Promise.all((Object.keys(SECURE_KEYS) as SecureKey[]).map(remove));
    },
  };
}
