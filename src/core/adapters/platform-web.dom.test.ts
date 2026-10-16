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

import { createPlatformDownload } from './download/platform-download';
import { createPlatformNetwork } from './network/platform-network';
import { createPlatformSecureStorage } from './secure-storage/platform-secure-storage';
import { STORAGE_KEYS } from './storage/storage-keys';
import { createPlatformStorage } from './storage/platform-storage';

describe('web platform adapters', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('storage puts device keys in localStorage and session keys in sessionStorage', () => {
    const storage = createPlatformStorage();
    storage.writeRaw('tenant', 'acme');
    storage.write('profile', { name: 'a' });
    expect(localStorage.getItem(STORAGE_KEYS.tenant.key)).toBe('acme');
    expect(sessionStorage.getItem(STORAGE_KEYS.profile.key)).toBe('{"name":"a"}');
  });

  it('secure storage is tab-scoped sessionStorage', async () => {
    const secure = createPlatformSecureStorage();
    await secure.set('session', 'k');
    expect(await secure.get('session')).toBe('k');
    expect(localStorage.length).toBe(0);
    await secure.clear();
    expect(sessionStorage.length).toBe(0);
  });

  it('download clicks a sanitised anchor and always revokes the object URL', async () => {
    const created = vi.fn(() => 'blob:x');
    const revoked = vi.fn();
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked });
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.download);
    });
    await createPlatformDownload().saveText('a,b', '../../Report.csv', 'text/csv');
    expect(clicks).toEqual(['Report.csv']);
    expect(revoked).toHaveBeenCalledWith('blob:x');
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });

  it('network follows the window online/offline events', async () => {
    const network = createPlatformNetwork();
    expect(await network.isOnline()).toBe(true);
    const seen: boolean[] = [];
    const stop = network.subscribe((o) => seen.push(o));
    globalThis.dispatchEvent(new Event('offline'));
    globalThis.dispatchEvent(new Event('online'));
    stop();
    globalThis.dispatchEvent(new Event('offline'));
    expect(seen).toEqual([false, true]);
  });
});
