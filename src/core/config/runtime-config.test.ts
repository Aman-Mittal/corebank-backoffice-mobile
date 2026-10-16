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

import { createFakeAdapters } from '@/testing/fake-adapters';

import {
  BUILD_DEFAULTS,
  isValidApiBaseUrl,
  readServerConfig,
  writeServerConfig,
} from './runtime-config';

describe('runtime config', () => {
  it('falls back to the build defaults', () => {
    expect(readServerConfig(createFakeAdapters().storage)).toEqual(BUILD_DEFAULTS);
  });

  it('round-trips a user override', () => {
    const { storage } = createFakeAdapters();
    writeServerConfig(storage, { apiBaseUrl: 'https://bank.test/api', tenantId: 'acme' });
    expect(readServerConfig(storage)).toEqual({
      apiBaseUrl: 'https://bank.test/api',
      tenantId: 'acme',
    });
  });

  it('ignores a stored override that is not a server address', () => {
    const { storage } = createFakeAdapters();
    storage.write('runtimeConfig', { apiBaseUrl: 'javascript:alert(1)' });
    expect(readServerConfig(storage).apiBaseUrl).toBe(BUILD_DEFAULTS.apiBaseUrl);
  });

  it('refuses to write an invalid address', () => {
    const { storage } = createFakeAdapters();
    expect(() => writeServerConfig(storage, { apiBaseUrl: 'ftp://x', tenantId: 't' })).toThrow();
    expect(isValidApiBaseUrl('http://10.0.2.2:8443/api')).toBe(true);
  });
});
