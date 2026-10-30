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

import { AUTH_API, type AuthApi } from '@/core/adapters/api/auth.api';
import { CLIENT_API, type ClientApi } from '@/core/adapters/api/client.api';
import { CLIENT_CHARGE_API, type ClientChargeApi } from '@/core/adapters/api/client-charge.api';
import { CLIENT_KYC_API, type ClientKycApi } from '@/core/adapters/api/client-kyc.api';
import { OFFICE_API, type OfficeApi } from '@/core/adapters/api/office.api';
import { STAFF_API, type StaffApi } from '@/core/adapters/api/staff.api';
import { TWO_FACTOR_API, type TwoFactorApi } from '@/core/adapters/api/two-factor.api';
import { USER_DETAILS_API, type UserDetailsApi } from '@/core/adapters/api/user-details.api';
import { PROFILE_API, type ProfileApi } from '@/core/adapters/api/profile.api';
import {
  createDeploymentConfigStore,
  DEPLOYMENT_CONFIG,
  type DeploymentConfigStore,
} from '@/core/config/deployment-config';
import { AdapterRegistry, provide, type AdapterOverride } from '@/core/adapters/registry';
import { SessionStore } from '@/core/auth/session-store';
import { APP_STORE, SESSION } from '@/core/tokens';
import { createAppStore, type AppStore } from '@/state/store';
import { CLOCK, type ClockAdapter } from '@/core/adapters/clock/clock.adapter';
import { DOWNLOAD, type DownloadAdapter } from '@/core/adapters/download/download.adapter';
import { sanitiseFilename } from '@/core/adapters/download/download.adapter';
import { I18N, type I18nAdapter, type Language } from '@/core/adapters/i18n/i18n.adapter';
import { NETWORK, type NetworkAdapter } from '@/core/adapters/network/network.adapter';
import {
  SECURE_STORAGE,
  createSecureStorage,
  type SecureStorageAdapter,
} from '@/core/adapters/secure-storage/secure-storage.adapter';
import {
  STORAGE,
  createStorage,
  memoryBackend,
  type StorageAdapter,
} from '@/core/adapters/storage/storage.adapter';

/**
 * In-memory implementations of every library adapter, for tests.
 *
 * Tests assert on what the code *asked for* (`fakes.download.saved`), not on what a library
 * rendered — the same approach as fineract-backoffice-ui's `provideFakeAdapters()`.
 */
export interface FakeAdapters {
  readonly overrides: AdapterOverride[];
  readonly registry: (extra?: readonly AdapterOverride[]) => AdapterRegistry;
  readonly storage: StorageAdapter;
  readonly secureStorage: SecureStorageAdapter & { readonly entries: Map<string, string> };
  readonly download: DownloadAdapter & {
    readonly saved: { filename: string; size: number; mimeType?: string }[];
  };
  readonly network: NetworkAdapter & { setOnline(online: boolean): void };
  readonly clock: ClockAdapter & { set(ms: number): void; advance(ms: number): void };
  readonly i18n: I18nAdapter;
  /** The Redux store; its thunks resolve adapters from the last registry built. */
  readonly store: AppStore;
  /** Signed out once `restore()` settles (it is called for you). */
  readonly session: SessionStore;
  /** API contracts that reject until a test overrides them, so an unexpected call is loud. */
  readonly authApi: AuthApi;
  readonly officeApi: OfficeApi;
  readonly staffApi: StaffApi;
  readonly clientApi: ClientApi;
  readonly clientKycApi: ClientKycApi;
  readonly clientChargeApi: ClientChargeApi;
  readonly twoFactorApi: TwoFactorApi;
  readonly userDetailsApi: UserDetailsApi;
  readonly profileApi: ProfileApi;
  /** No identity provider unless a test passes `deploymentConfig` overrides. */
  readonly deploymentConfig: DeploymentConfigStore;
}

const unscripted = (name: string) => async (): Promise<never> => {
  throw new Error(`${name} was called but the test did not script it`);
};

export function createFakeAdapters(): FakeAdapters {
  const backends = { session: memoryBackend(), device: memoryBackend() };
  const storage = createStorage(() => backends);

  const secureEntries = new Map<string, string>();
  const secureStorage = Object.assign(
    createSecureStorage({
      getItem: async (n) => secureEntries.get(n) ?? null,
      setItem: async (n, v) => void secureEntries.set(n, v),
      removeItem: async (n) => void secureEntries.delete(n),
    }),
    { entries: secureEntries },
  );

  const saved: { filename: string; size: number; mimeType?: string }[] = [];
  const download: FakeAdapters['download'] = {
    saved,
    async save(content, filename, mimeType) {
      const size = content instanceof Uint8Array ? content.byteLength : content.size;
      saved.push({ filename: sanitiseFilename(filename), size, ...(mimeType ? { mimeType } : {}) });
    },
    async saveText(text, filename, mimeType) {
      await download.save(new TextEncoder().encode(text), filename, mimeType);
    },
  };

  let online = true;
  const listeners = new Set<(o: boolean) => void>();
  const network: FakeAdapters['network'] = {
    isOnline: async () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setOnline(next) {
      online = next;
      for (const l of listeners) l(next);
    },
  };

  let now = Date.UTC(2026, 0, 15, 9, 0, 0);
  const clock: FakeAdapters['clock'] = {
    now: () => now,
    set: (ms) => void (now = ms),
    advance: (ms) => void (now += ms),
  };

  // Echoes keys, so assertions name the key a screen used rather than an English string.
  let language: Language = 'en';
  const i18n: I18nAdapter = {
    translate: (key, params) =>
      params
        ? `${key}(${Object.entries(params)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')})`
        : key,
    language: () => language,
    setLanguage: async (l) => void (language = l),
    subscribe: () => () => undefined,
  };

  // Thunks resolve through the registry a test actually renders with (its overrides included),
  // which is built after the store.
  let built: AdapterRegistry | null = null;
  const store = createAppStore({
    resolve: (t) => (built ??= new AdapterRegistry(overrides)).resolve(t),
  });
  const session = new SessionStore(secureStorage, () => 'default', undefined, store);
  void session.restore();
  const authApi: AuthApi = { signIn: unscripted('AuthApi.signIn') };
  const officeApi: OfficeApi = {
    list: unscripted('OfficeApi.list'),
    get: unscripted('OfficeApi.get'),
    create: unscripted('OfficeApi.create'),
    update: unscripted('OfficeApi.update'),
  };
  const staffApi: StaffApi = {
    list: unscripted('StaffApi.list'),
    get: unscripted('StaffApi.get'),
    create: unscripted('StaffApi.create'),
    update: unscripted('StaffApi.update'),
  };
  const clientApi: ClientApi = {
    list: unscripted('ClientApi.list'),
    get: unscripted('ClientApi.get'),
    create: unscripted('ClientApi.create'),
    command: unscripted('ClientApi.command'),
    reasons: unscripted('ClientApi.reasons'),
    staffOptions: unscripted('ClientApi.staffOptions'),
    assignStaff: unscripted('ClientApi.assignStaff'),
    unassignStaff: unscripted('ClientApi.unassignStaff'),
  };
  const clientKycApi: ClientKycApi = {
    identifiers: unscripted('ClientKycApi.identifiers'),
    documentTypes: unscripted('ClientKycApi.documentTypes'),
    addIdentifier: unscripted('ClientKycApi.addIdentifier'),
    deleteIdentifier: unscripted('ClientKycApi.deleteIdentifier'),
    notes: unscripted('ClientKycApi.notes'),
    addNote: unscripted('ClientKycApi.addNote'),
    updateNote: unscripted('ClientKycApi.updateNote'),
    deleteNote: unscripted('ClientKycApi.deleteNote'),
  };
  const clientChargeApi: ClientChargeApi = {
    charges: unscripted('ClientChargeApi.charges'),
    chargeOptions: unscripted('ClientChargeApi.chargeOptions'),
    addCharge: unscripted('ClientChargeApi.addCharge'),
    payCharge: unscripted('ClientChargeApi.payCharge'),
    waiveCharge: unscripted('ClientChargeApi.waiveCharge'),
    deleteCharge: unscripted('ClientChargeApi.deleteCharge'),
  };

  const twoFactorApi: TwoFactorApi = {
    methods: unscripted('TwoFactorApi.methods'),
    request: unscripted('TwoFactorApi.request'),
    validate: unscripted('TwoFactorApi.validate'),
    invalidate: unscripted('TwoFactorApi.invalidate'),
  };
  const userDetailsApi: UserDetailsApi = { sessionFor: unscripted('UserDetailsApi.sessionFor') };
  const profileApi: ProfileApi = {
    get: unscripted('ProfileApi.get'),
    passwordPolicy: unscripted('ProfileApi.passwordPolicy'),
    changePassword: unscripted('ProfileApi.changePassword'),
  };
  const deploymentConfig = createDeploymentConfigStore(async () => null);
  void deploymentConfig.load();

  const overrides: AdapterOverride[] = [
    provide(APP_STORE, store),
    provide(SESSION, session),
    provide(PROFILE_API, profileApi),
    provide(TWO_FACTOR_API, twoFactorApi),
    provide(USER_DETAILS_API, userDetailsApi),
    provide(DEPLOYMENT_CONFIG, deploymentConfig),
    provide(AUTH_API, authApi),
    provide(OFFICE_API, officeApi),
    provide(STAFF_API, staffApi),
    provide(CLIENT_API, clientApi),
    provide(CLIENT_KYC_API, clientKycApi),
    provide(CLIENT_CHARGE_API, clientChargeApi),
    provide(STORAGE, storage),
    provide(SECURE_STORAGE, secureStorage),
    provide(DOWNLOAD, download),
    provide(NETWORK, network),
    provide(CLOCK, clock),
    provide(I18N, i18n),
  ];

  return {
    overrides,
    registry: (extra = []) => (built = new AdapterRegistry([...overrides, ...extra])),
    storage,
    secureStorage,
    download,
    network,
    clock,
    i18n,
    store,
    session,
    authApi,
    officeApi,
    staffApi,
    clientApi,
    clientKycApi,
    clientChargeApi,
    twoFactorApi,
    userDetailsApi,
    profileApi,
    deploymentConfig,
  };
}
