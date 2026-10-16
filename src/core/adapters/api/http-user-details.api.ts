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
import { AppError } from '@/core/http/app-error';
import { LEGACY_TENANT_HEADER, TENANT_HEADER } from '@/core/http/auth';
import { call, type ApiClient } from '@/core/http/client';

import type { Session } from './auth.api';
import { required } from './required';
import { OidcUnsupportedError, type UserDetailsApi } from './user-details.api';

type UserDetailsPayload = components['schemas']['GetUserDetailsResponse'];

export function mapUserDetails(
  payload: UserDetailsPayload,
  tenantId: string,
  accessToken: string,
): Session {
  return {
    userId: required(payload.userId, 'user details', 'userId'),
    username: payload.username ?? '',
    displayName: payload.staffDisplayName ?? null,
    officeId: required(payload.officeId, 'user details', 'officeId'),
    officeName: payload.officeName ?? '',
    tenantId,
    permissions: (payload.permissions ?? []).map((p) => p.trim().toUpperCase()).filter(Boolean),
    roles: (payload.roles ?? []).map((r) => r.name ?? '').filter(Boolean),
    credential: accessToken,
    scheme: 'Bearer',
    tfaToken: null,
    twoFactorRequired: false,
    passwordRenewalRequired: false,
  };
}

export class HttpUserDetailsApi implements UserDetailsApi {
  constructor(private readonly client: ApiClient) {}

  async sessionFor(accessToken: string, tenantId: string): Promise<Session> {
    try {
      const payload = await call(
        this.client.GET('/v1/userdetails', {
          // Explicit, so the pipeline neither adds a stale credential nor the stored tenant.
          headers: {
            Authorization: `Bearer ${accessToken}`,
            [TENANT_HEADER]: tenantId,
            [LEGACY_TENANT_HEADER]: tenantId,
          },
        }),
      );
      return mapUserDetails(payload, tenantId, accessToken);
    } catch (error) {
      if (error instanceof AppError && [401, 403, 404].includes(error.status)) {
        throw new OidcUnsupportedError(error.status);
      }
      throw error;
    }
  }
}
