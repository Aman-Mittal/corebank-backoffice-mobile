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

import type { Middleware } from './pipeline';

export const TENANT_HEADER = 'Fineract-Platform-TenantId';
export const LEGACY_TENANT_HEADER = 'X-Mifos-Platform-TenantId';
export const TFA_HEADER = 'Fineract-Platform-TFA-Token';

/** What the auth middleware needs to know, read fresh for every request. */
export interface AuthState {
  readonly tenantId: string;
  /** `Basic` key from `/authentication`, or an OIDC access token. */
  readonly credential: { readonly scheme: 'Basic' | 'Bearer'; readonly value: string } | null;
  readonly tfaToken: string | null;
}

/**
 * Whether a request is bound for the configured API.
 *
 * Credentials must not travel anywhere else (fineract-backoffice-ui, `isApiRequest`). Compared by
 * origin, so a path change on the API host stays trusted and any other host does not. Unlike a
 * browser page, a native app has no "same origin" of its own, so only the API origin is trusted.
 */
export function isApiRequest(url: string, apiBaseUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(apiBaseUrl).origin;
  } catch {
    return false;
  }
}

/**
 * Adds the tenant headers, the credential and the two-factor token to API requests.
 *
 * A request that already names a tenant keeps it: sign-in sends the tenant typed into the form
 * before it becomes the session's tenant.
 */
export function auth(state: () => AuthState, apiBaseUrl: () => string): Middleware {
  return (next) => (request) => {
    if (!isApiRequest(request.url, apiBaseUrl())) return next(request);

    const { tenantId, credential, tfaToken } = state();
    if (!request.headers.has(TENANT_HEADER) && !request.headers.has(LEGACY_TENANT_HEADER)) {
      request.headers.set(TENANT_HEADER, tenantId);
      request.headers.set(LEGACY_TENANT_HEADER, tenantId);
    }
    if (credential && !request.headers.has('Authorization')) {
      request.headers.set('Authorization', `${credential.scheme} ${credential.value}`);
    }
    if (tfaToken) request.headers.set(TFA_HEADER, tfaToken);
    return next(request);
  };
}
