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

vi.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));
vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'hi-IN' }] }));

import { CLOCK } from './adapters/clock/clock.adapter';
import { DOWNLOAD } from './adapters/download/download.adapter';
import { I18N } from './adapters/i18n/i18n.adapter';
import { NETWORK } from './adapters/network/network.adapter';
import { provide } from './adapters/registry';
import { SECURE_STORAGE } from './adapters/secure-storage/secure-storage.adapter';
import { STORAGE } from './adapters/storage/storage.adapter';
import {
  API_CLIENT,
  AUTH_STATE,
  SESSION,
  SESSION_EXPIRED,
  createAppRegistry,
} from './app-registry';
import { AUTH_API } from './adapters/api/auth.api';
import { mapSession } from './adapters/api/http-auth.api';
import { OFFICE_API } from './adapters/api/office.api';
import { TWO_FACTOR_API } from './adapters/api/two-factor.api';
import captured from '@/testing/fixtures/backend/authentication.json';

const SESSION_FIXTURE = mapSession(captured, 'default');
import { createFakeAdapters } from '@/testing/fake-adapters';

describe('createAppRegistry', () => {
  it('registers a default for every token', () => {
    const r = createAppRegistry();
    for (const t of [
      STORAGE,
      SECURE_STORAGE,
      DOWNLOAD,
      NETWORK,
      CLOCK,
      I18N,
      AUTH_STATE,
      SESSION_EXPIRED,
      API_CLIENT,
    ]) {
      expect(() => r.resolve(t as never)).not.toThrow();
    }
    expect(typeof r.resolve(CLOCK).now()).toBe('number');
    expect(r.resolve(SESSION_EXPIRED)()).toBeUndefined();
  });

  it('picks the language from storage first, then the device locale', () => {
    expect(createAppRegistry().resolve(I18N).language()).toBe('hi');
    const fakes = createFakeAdapters();
    fakes.storage.writeRaw('language', 'ko');
    expect(
      createAppRegistry([provide(STORAGE, fakes.storage)])
        .resolve(I18N)
        .language(),
    ).toBe('ko');
  });

  it('sends no credentials before sign-in, with the configured tenant', () => {
    const fakes = createFakeAdapters();
    fakes.storage.writeRaw('tenant', 'acme');
    const state = createAppRegistry([provide(STORAGE, fakes.storage)]).resolve(AUTH_STATE)();
    expect(state).toEqual({ tenantId: 'acme', credential: null, tfaToken: null });
  });

  it('ends the session as expired when the pipeline reports a rejected credential', async () => {
    const fakes = createFakeAdapters();
    const r = createAppRegistry([provide(SECURE_STORAGE, fakes.secureStorage)]);
    await r.resolve(SESSION).restore();
    await r.resolve(SESSION).signIn({ ...SESSION_FIXTURE });
    r.resolve(SESSION_EXPIRED)();
    expect(r.resolve(SESSION).getState()).toEqual({
      status: 'signedOut',
      reason: 'session-expired',
    });
    expect(r.resolve(AUTH_API)).toBeDefined();
    expect(r.resolve(OFFICE_API)).toBeDefined();
  });

  it('wires the API client to the configured server and the session-expiry hook', async () => {
    const fakes = createFakeAdapters();
    fakes.storage.write('runtimeConfig', { apiBaseUrl: 'https://bank.test/api' });
    const expired = vi.fn();
    const seen: Request[] = [];
    vi.stubGlobal('fetch', async (req: Request) => {
      seen.push(req);
      return new Response(null, { status: 401 });
    });
    const r = createAppRegistry([
      provide(STORAGE, fakes.storage),
      provide(AUTH_STATE, () => ({
        tenantId: 't',
        credential: { scheme: 'Basic' as const, value: 'k' },
        tfaToken: null,
      })),
      provide(SESSION_EXPIRED, expired),
    ]);
    await r.resolve(API_CLIENT).GET('/v1/offices');
    expect(seen[0]!.url).toBe('https://bank.test/api/v1/offices');
    expect(seen[0]!.headers.get('X-Correlation-ID')).toBe('00000000-0000-4000-8000-000000000000');
    expect(expired).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('invalidates the TFA token through the two-factor API on sign-out (e2e P1-SHELL-036/11 found this unwired)', async () => {
    const fakes = createFakeAdapters();
    const invalidate = vi.fn(async () => undefined);
    const r = createAppRegistry([
      provide(SECURE_STORAGE, fakes.secureStorage),
      provide(TWO_FACTOR_API, { ...fakes.twoFactorApi, invalidate }),
    ]);
    await r.resolve(SESSION).restore();
    await r.resolve(SESSION).signIn({ ...SESSION_FIXTURE, tfaToken: 'tfa-1' });
    await r.resolve(SESSION).signOut();
    expect(invalidate).toHaveBeenCalledExactlyOnceWith('tfa-1');
  });
});
