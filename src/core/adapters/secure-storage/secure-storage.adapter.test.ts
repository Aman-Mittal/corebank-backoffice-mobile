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

import { SECURE_KEYS, createSecureStorage } from './secure-storage.adapter';

describe('createSecureStorage', () => {
  it('stores credentials under the declared names and clears all of them', async () => {
    const entries = new Map<string, string>();
    const s = createSecureStorage({
      getItem: async (n) => entries.get(n) ?? null,
      setItem: async (n, v) => void entries.set(n, v),
      removeItem: async (n) => void entries.delete(n),
    });
    await s.set('session', 'abc');
    await s.set('tfaToken', 'xyz');
    expect(entries.get(SECURE_KEYS.session)).toBe('abc');
    expect(await s.get('tfaToken')).toBe('xyz');
    await s.clear();
    expect(entries.size).toBe(0);
  });

  it('reads a failing keystore as no credential, and never rejects', async () => {
    const fail = async () => {
      throw new Error('keystore locked');
    };
    const s = createSecureStorage({ getItem: fail, setItem: fail, removeItem: fail });
    await expect(s.get('session')).resolves.toBeNull();
    await expect(s.set('session', 'x')).resolves.toBeUndefined();
    await expect(s.clear()).resolves.toBeUndefined();
  });
});
