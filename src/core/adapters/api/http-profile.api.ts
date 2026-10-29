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
import { call, type ApiClient } from '@/core/http/client';

import type { PasswordChange, ProfileApi, UserProfile } from './profile.api';
import { required } from './required';

type UserPayload = components['schemas']['GetUsersUserIdResponse'];
type PolicyPayload = components['schemas']['GetPasswordPreferencesTemplateResponse'];

const orNull = (value: string | undefined): string | null => value || null;

/** Maps `GET /users/{id}`. Exported for its own test: this is where upstream drift surfaces. */
export function mapUserProfile(payload: UserPayload): UserProfile {
  return {
    id: required(payload.id, 'user', 'id'),
    username: payload.username ?? '',
    firstname: orNull(payload.firstname),
    lastname: orNull(payload.lastname),
    email: orNull(payload.email),
    officeId: payload.officeId ?? null,
    officeName: orNull(payload.officeName),
    roles: (payload.selectedRoles ?? []).map((r) => r.name ?? '').filter(Boolean),
  };
}

/**
 * The active policy's description. `GET /passwordpreferences` is declared to answer one policy,
 * and has been seen to answer the whole list, so both are read.
 */
export function activePolicy(body: PolicyPayload | PolicyPayload[] | undefined): string | null {
  const policies = Array.isArray(body) ? body : body ? [body] : [];
  return policies.find((p) => p.active)?.description ?? null;
}

export class HttpProfileApi implements ProfileApi {
  constructor(private readonly client: ApiClient) {}

  async get(userId: number): Promise<UserProfile> {
    const payload = await call(
      this.client.GET('/v1/users/{userId}', { params: { path: { userId } } }),
    );
    return mapUserProfile(payload);
  }

  async passwordPolicy(): Promise<string | null> {
    return activePolicy(await call(this.client.GET('/v1/passwordpreferences')));
  }

  async changePassword(userId: number, change: PasswordChange): Promise<void> {
    await call(
      this.client.POST('/v1/users/{userId}/pwd', {
        params: { path: { userId } },
        body: { password: change.password, repeatPassword: change.repeatPassword },
      }),
    );
  }
}
