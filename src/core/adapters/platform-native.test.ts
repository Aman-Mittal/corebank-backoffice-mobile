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
 * The native adapter implementations, with the native modules mocked at the import boundary.
 * What is under test is the mapping onto each module's API; the modules themselves run in the
 * Maestro flows on a device.
 */
const mmkv = new Map<string, string>();
vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (k: string) => mmkv.get(k),
    set: (k: string, v: string) => void mmkv.set(k, v),
    remove: (k: string) => mmkv.delete(k),
  }),
}));

const keychain = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'wutdo',
  getItemAsync: async (k: string) => keychain.get(k) ?? null,
  setItemAsync: async (k: string, v: string, o: { keychainAccessible: string }) => {
    if (o.keychainAccessible !== 'wutdo') throw new Error('wrong accessibility');
    keychain.set(k, v);
  },
  deleteItemAsync: async (k: string) => void keychain.delete(k),
}));

const written: { name: string; bytes: number }[] = [];
const shared: string[] = [];
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    readonly uri: string;
    constructor(
      dir: string,
      readonly name: string,
    ) {
      this.uri = `${dir}/${name}`;
    }
    create() {}
    write(b: Uint8Array) {
      written.push({ name: this.name, bytes: b.byteLength });
    }
  },
}));
vi.mock('expo-sharing', () => ({
  isAvailableAsync: async () => true,
  shareAsync: async (uri: string) => void shared.push(uri),
}));

let netListener: ((s: object) => void) | undefined;
vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: async () => ({ isConnected: true, isInternetReachable: null }),
    addEventListener: (l: (s: object) => void) => {
      netListener = l;
      return () => (netListener = undefined);
    },
  },
}));

import { createPlatformDownload } from './download/platform-download.native';
import { createPlatformNetwork } from './network/platform-network.native';
import { createPlatformSecureStorage } from './secure-storage/platform-secure-storage.native';
import { STORAGE_KEYS } from './storage/storage-keys';
import { createPlatformStorage } from './storage/platform-storage.native';

describe('native platform adapters', () => {
  it('storage keeps device keys in MMKV and session keys only in memory', () => {
    const storage = createPlatformStorage();
    storage.writeRaw('tenant', 'acme');
    storage.write('profile', { n: 1 });
    expect(mmkv.get(STORAGE_KEYS.tenant.key)).toBe('acme');
    expect(mmkv.has(STORAGE_KEYS.profile.key)).toBe(false);
    expect(storage.read('profile', null)).toEqual({ n: 1 });
    storage.remove('tenant');
    expect(mmkv.has(STORAGE_KEYS.tenant.key)).toBe(false);
  });

  it('secure storage uses the keystore with device-only, unlocked-only access', async () => {
    const secure = createPlatformSecureStorage();
    await secure.set('session', 'k');
    expect(await secure.get('session')).toBe('k');
    await secure.remove('session');
    expect(keychain.size).toBe(0);
  });

  it('download writes a sanitised file to the cache and opens the share sheet', async () => {
    await createPlatformDownload().saveText('a,b', '../statement.csv', 'text/csv');
    expect(written).toEqual([{ name: 'statement.csv', bytes: 3 }]);
    expect(shared).toEqual(['file:///cache/statement.csv']);
  });

  it('network treats an unprobed reachability as online, and a known-unreachable as offline', async () => {
    const network = createPlatformNetwork();
    expect(await network.isOnline()).toBe(true);
    const seen: boolean[] = [];
    network.subscribe((o) => seen.push(o));
    netListener?.({ isConnected: true, isInternetReachable: false });
    netListener?.({ isConnected: false, isInternetReachable: null });
    expect(seen).toEqual([false, false]);
  });
});
