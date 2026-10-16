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

import {
  STORAGE_KEYS,
  createStorage,
  memoryBackend,
  type KeyValueBackend,
} from './storage.adapter';

const make = () => {
  const session = memoryBackend();
  const device = memoryBackend();
  return { session, device, storage: createStorage(() => ({ session, device })) };
};

describe('createStorage', () => {
  it('round-trips JSON under the declared key and scope', () => {
    const { storage, device } = make();
    storage.write('runtimeConfig', { apiBaseUrl: 'https://x.test/api' });
    expect(device.entries.get(STORAGE_KEYS.runtimeConfig.key)).toBe(
      '{"apiBaseUrl":"https://x.test/api"}',
    );
    expect(storage.read('runtimeConfig', null)).toEqual({ apiBaseUrl: 'https://x.test/api' });
  });

  it('answers the fallback for a missing or unparseable value', () => {
    const { storage, device } = make();
    expect(storage.read('theme', 'light')).toBe('light');
    device.entries.set(STORAGE_KEYS.theme.key, '{not json');
    expect(storage.read('theme', 'light')).toBe('light');
  });

  it('clears only its own keys in one scope', () => {
    const { storage, session, device } = make();
    storage.write('profile', { name: 'a' });
    storage.writeRaw('tenant', 'default');
    session.entries.set('someone-elses-key', 'keep');
    storage.clearScope('session');
    expect(storage.readRaw('profile')).toBeNull();
    expect(session.entries.get('someone-elses-key')).toBe('keep');
    expect(device.entries.get(STORAGE_KEYS.tenant.key)).toBe('default');
  });

  it('never throws when the backend does', () => {
    const exploding: KeyValueBackend = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    const storage = createStorage(() => ({ session: exploding, device: exploding }));
    expect(() => storage.writeRaw('tenant', 'x')).not.toThrow();
    expect(storage.readRaw('tenant')).toBeNull();
    expect(() => storage.remove('tenant')).not.toThrow();
    expect(() => storage.clearScope('device')).not.toThrow();
  });

  it('treats a denied store (getter throws) as absent', () => {
    const storage = createStorage(() => {
      throw new Error('denied');
    });
    expect(storage.read('theme', 'dark')).toBe('dark');
  });

  it('uses the cbo_ prefix for every key', () => {
    for (const { key } of Object.values(STORAGE_KEYS)) expect(key).toMatch(/^cbo_[a-z_]+$/);
  });
});
