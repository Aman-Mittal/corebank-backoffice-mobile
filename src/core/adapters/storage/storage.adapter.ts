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
import { STORAGE_KEYS, type StorageKey, type StorageScope } from './storage-keys';

export { STORAGE_KEYS } from './storage-keys';
export type { StorageKey, StorageScope } from './storage-keys';

/**
 * Key-value persistence, stated as what the application needs.
 *
 * Reads never throw: a value that will not parse reads as absent and the caller's fallback
 * applies. Writes never throw: a full or denied store loses persistence, not the screen.
 * Both rules come from fineract-backoffice-ui's `StorageAdapter`, where an unguarded parse of one
 * corrupted value left the app blank at bootstrap.
 */
export interface StorageAdapter {
  read<T>(key: StorageKey, fallback: T): T;
  readRaw(key: StorageKey): string | null;
  write(key: StorageKey, value: unknown): void;
  writeRaw(key: StorageKey, value: string): void;
  remove(key: StorageKey): void;
  /** Removes this application's keys in one scope, and nothing else. */
  clearScope(scope: StorageScope): void;
}

export const STORAGE = token<StorageAdapter>('StorageAdapter');

/**
 * The minimal synchronous store a platform has to provide. Web Storage and MMKV both fit it,
 * and an in-memory map fits it for tests.
 */
export interface KeyValueBackend {
  getItem(name: string): string | null | undefined;
  setItem(name: string, value: string): void;
  removeItem(name: string): void;
}

/** A backend per scope. `null` means the platform denied storage for that scope. */
export type ScopedBackends = Readonly<Record<StorageScope, KeyValueBackend | null>>;

/**
 * Builds a {@link StorageAdapter} over platform backends.
 *
 * The guarding lives here once, so the web and native implementations are only the choice of
 * backend and cannot drift on the rules.
 */
export function createStorage(backends: () => ScopedBackends): StorageAdapter {
  const store = (scope: StorageScope): KeyValueBackend | null => {
    try {
      return backends()[scope];
    } catch {
      // Touching `localStorage` itself throws when an origin is denied storage.
      return null;
    }
  };

  const readRaw = (key: StorageKey): string | null => {
    const { key: name, scope } = STORAGE_KEYS[key];
    try {
      return store(scope)?.getItem(name) ?? null;
    } catch {
      return null;
    }
  };

  const writeRaw = (key: StorageKey, value: string): void => {
    const { key: name, scope } = STORAGE_KEYS[key];
    try {
      store(scope)?.setItem(name, value);
    } catch {
      // Quota exceeded or storage denied: persistence is lost, the session keeps working.
    }
  };

  const removeName = (scope: StorageScope, name: string): void => {
    try {
      store(scope)?.removeItem(name);
    } catch {
      /* nothing to remove if the store is unreachable */
    }
  };

  return {
    readRaw,
    writeRaw,
    read<T>(key: StorageKey, fallback: T): T {
      const raw = readRaw(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      writeRaw(key, JSON.stringify(value));
    },
    remove(key) {
      const { key: name, scope } = STORAGE_KEYS[key];
      removeName(scope, name);
    },
    clearScope(scope) {
      // Only our own keys: `clear()` would also remove anything else served from this origin.
      for (const entry of Object.values(STORAGE_KEYS)) {
        if (entry.scope === scope) removeName(scope, entry.key);
      }
    },
  };
}

/** An in-memory backend, for tests and for a native `session` scope that must not persist. */
export function memoryBackend(): KeyValueBackend & { readonly entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (name) => entries.get(name) ?? null,
    setItem: (name, value) => void entries.set(name, value),
    removeItem: (name) => void entries.delete(name),
  };
}
