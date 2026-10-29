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

import * as Crypto from 'expo-crypto';
import { getLocales } from 'expo-localization';

import { AdapterRegistry, type AdapterOverride } from './adapters/registry';
import { CLOCK, systemClock } from './adapters/clock/clock.adapter';
import { DOWNLOAD } from './adapters/download/download.adapter';
import { createPlatformDownload } from './adapters/download/platform-download';
import { I18N, pickLanguage, type Language } from './adapters/i18n/i18n.adapter';
import { createI18nextAdapter } from './adapters/i18n/i18next.adapter';
import { NETWORK } from './adapters/network/network.adapter';
import { createPlatformNetwork } from './adapters/network/platform-network';
import { SECURE_STORAGE } from './adapters/secure-storage/secure-storage.adapter';
import { createPlatformSecureStorage } from './adapters/secure-storage/platform-secure-storage';
import { STORAGE } from './adapters/storage/storage.adapter';
import { createPlatformStorage } from './adapters/storage/platform-storage';
import { createApiClient } from './http/client';
import { API_CLIENT, APP_STORE, AUTH_STATE, SESSION, SESSION_EXPIRED } from './tokens';

export { API_CLIENT, APP_STORE, AUTH_STATE, SESSION, SESSION_EXPIRED } from './tokens';
import { readServerConfig } from './config/runtime-config';
import { AUTH_API } from './adapters/api/auth.api';
import { HttpAuthApi } from './adapters/api/http-auth.api';
import { HttpOfficeApi } from './adapters/api/http-office.api';
import { CLIENT_API } from './adapters/api/client.api';
import { CLIENT_KYC_API } from './adapters/api/client-kyc.api';
import { HttpClientApi } from './adapters/api/http-client.api';
import { HttpClientKycApi } from './adapters/api/http-client-kyc.api';
import { OFFICE_API } from './adapters/api/office.api';
import { HttpStaffApi } from './adapters/api/http-staff.api';
import { STAFF_API } from './adapters/api/staff.api';
import { SessionStore } from './auth/session-store';
import { HttpProfileApi } from './adapters/api/http-profile.api';
import { PROFILE_API } from './adapters/api/profile.api';
import { createAppStore } from '@/state/store';
import { HttpTwoFactorApi } from './adapters/api/http-two-factor.api';
import { HttpUserDetailsApi } from './adapters/api/http-user-details.api';
import { TWO_FACTOR_API } from './adapters/api/two-factor.api';
import { USER_DETAILS_API } from './adapters/api/user-details.api';
import { createDeploymentConfigStore, DEPLOYMENT_CONFIG } from './config/deployment-config';
import { readDeploymentSource } from './config/deployment-source';

/**
 * Builds the application registry: every default implementation, keyed by token.
 *
 * Platform files (`*.native.ts` / `*.ts`) are chosen by Metro, so this module names one import
 * per adapter and is the same on every platform. The Redux store's thunks resolve adapters at
 * call time, through this same registry.
 */
export function createAppRegistry(overrides: readonly AdapterOverride[] = []): AdapterRegistry {
  return new AdapterRegistry(overrides)
    .register(STORAGE, () => createPlatformStorage())
    .register(SECURE_STORAGE, () => createPlatformSecureStorage())
    .register(DOWNLOAD, () => createPlatformDownload())
    .register(NETWORK, () => createPlatformNetwork())
    .register(CLOCK, () => systemClock)
    .register(I18N, (r) => {
      const chosen = r.resolve(STORAGE).readRaw('language') as Language | null;
      const device = getLocales().map((l) => l.languageTag);
      return createI18nextAdapter(pickLanguage([chosen, ...device]));
    })
    .register(APP_STORE, (r) => createAppStore({ resolve: (t) => r.resolve(t) }))
    .register(
      SESSION,
      (r) =>
        new SessionStore(
          r.resolve(SECURE_STORAGE),
          () => readServerConfig(r.resolve(STORAGE)).tenantId,
          // Resolved at call time: the API client depends on the session for its credentials.
          (tfaToken) => r.resolve(TWO_FACTOR_API).invalidate(tfaToken),
          r.resolve(APP_STORE),
        ),
    )
    .register(AUTH_STATE, (r) => r.resolve(SESSION).authState)
    .register(SESSION_EXPIRED, (r) => () => void r.resolve(SESSION).signOut('session-expired'))
    .register(AUTH_API, (r) => new HttpAuthApi(r.resolve(API_CLIENT)))
    .register(OFFICE_API, (r) => new HttpOfficeApi(r.resolve(API_CLIENT)))
    .register(STAFF_API, (r) => new HttpStaffApi(r.resolve(API_CLIENT)))
    .register(CLIENT_API, (r) => new HttpClientApi(r.resolve(API_CLIENT)))
    .register(CLIENT_KYC_API, (r) => new HttpClientKycApi(r.resolve(API_CLIENT)))
    .register(TWO_FACTOR_API, (r) => new HttpTwoFactorApi(r.resolve(API_CLIENT)))
    .register(USER_DETAILS_API, (r) => new HttpUserDetailsApi(r.resolve(API_CLIENT)))
    .register(PROFILE_API, (r) => new HttpProfileApi(r.resolve(API_CLIENT)))
    .register(DEPLOYMENT_CONFIG, () => createDeploymentConfigStore(readDeploymentSource))
    .register(API_CLIENT, (r) =>
      createApiClient({
        baseUrl: () => readServerConfig(r.resolve(STORAGE)).apiBaseUrl,
        authState: () => r.resolve(AUTH_STATE)(),
        onSessionExpired: () => r.resolve(SESSION_EXPIRED)(),
        newCorrelationId: () => Crypto.randomUUID(),
      }),
    );
}
