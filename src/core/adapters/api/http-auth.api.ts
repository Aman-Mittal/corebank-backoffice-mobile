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

import type { components } from '@/api/generated/openapi';
import { LEGACY_TENANT_HEADER, TENANT_HEADER } from '@/core/http/auth';
import { call, type ApiClient } from '@/core/http/client';

import type { AuthApi, Session, SignInRequest } from './auth.api';
import { required } from './required';

/**
 * What `POST /authentication` sends, where it differs from the generated type: two flags the
 * server sends and the spec does not declare (fineract-backoffice-ui reads both).
 */
export type AuthenticationPayload = components['schemas']['PostAuthenticationResponse'] & {
  readonly isTwoFactorAuthenticationRequired?: boolean;
  readonly shouldRenewPassword?: boolean;
};

export function mapSession(payload: AuthenticationPayload, tenantId: string): Session {
  return {
    userId: required(payload.userId, 'a session', 'userId'),
    username: payload.username ?? '',
    displayName: payload.staffDisplayName ?? null,
    officeId: required(payload.officeId, 'a session', 'officeId'),
    officeName: payload.officeName ?? '',
    tenantId,
    permissions: (payload.permissions ?? []).map((p) => p.trim().toUpperCase()).filter(Boolean),
    roles: (payload.roles ?? []).map((r) => r.name ?? '').filter(Boolean),
    credential: required(payload.base64EncodedAuthenticationKey, 'a session', 'authentication key'),
    scheme: 'Basic',
    tfaToken: null,
    twoFactorRequired: payload.isTwoFactorAuthenticationRequired === true,
    passwordRenewalRequired: payload.shouldRenewPassword === true,
  };
}

export class HttpAuthApi implements AuthApi {
  constructor(private readonly client: ApiClient) {}

  async signIn({ username, password, tenantId }: SignInRequest): Promise<Session> {
    const payload = await call(
      this.client.POST('/v1/authentication', {
        body: { username, password },
        // The typed tenant, not the stored one: it becomes the session's tenant only on success.
        headers: { [TENANT_HEADER]: tenantId, [LEGACY_TENANT_HEADER]: tenantId },
      }),
    );
    return mapSession(payload as AuthenticationPayload, tenantId);
  }
}
