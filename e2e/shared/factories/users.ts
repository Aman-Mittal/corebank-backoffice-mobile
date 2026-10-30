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

import type { APIRequestContext } from '@playwright/test';

import { adminHeaders, apiBaseUrl, fineractGet, fineractPost, runId } from '../fineract-api';

/**
 * Creates a role holding exactly `permissions`, and a user with only that role in `officeId`
 * (the head office by default), through the REST API. Written for this project (not copied from
 * any reference suite).
 */
export async function createRestrictedUser(
  request: APIRequestContext,
  permissions: readonly string[],
  officeId = 1,
) {
  const id = runId();
  const role = await fineractPost(request, '/v1/roles', {
    name: `e2e-role-${id}`,
    description: 'e2e restricted role',
  });
  if (!role.ok()) throw new Error(`POST /roles answered ${role.status()}: ${await role.text()}`);
  const roleId = (await role.json()).resourceId as number;

  const grant = await request.put(`${apiBaseUrl()}/v1/roles/${roleId}/permissions`, {
    headers: adminHeaders(),
    data: { permissions: Object.fromEntries(permissions.map((p) => [p, true])) },
    ignoreHTTPSErrors: true,
  });
  if (!grant.ok()) throw new Error(`PUT /roles/${roleId}/permissions answered ${grant.status()}`);

  const username = `e2e-user-${id}`;
  // The server's default policy: 12-50 characters, upper and lower case, a digit, a symbol, and
  // no character twice in a row (so runs in the id are collapsed).
  const password = `Mbo-${id}-Xy7!`.replaceAll(/(.)\1+/g, '$1');
  const user = await fineractPost(request, '/v1/users', {
    username,
    firstname: 'E2E',
    lastname: id,
    email: `${username}@example.invalid`,
    officeId,
    roles: [roleId],
    sendPasswordToEmail: false,
    passwordNeverExpires: true,
    password,
    repeatPassword: password,
  });
  if (!user.ok()) throw new Error(`POST /users answered ${user.status()}: ${await user.text()}`);
  return { username, password, roleId, userId: (await user.json()).resourceId as number };
}

/** Signs in through the API and answers the permissions the platform reports. */
export async function permissionsOf(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  const res = await request.post(`${apiBaseUrl()}/v1/authentication`, {
    headers: {
      'Fineract-Platform-TenantId': process.env.E2E_TENANT ?? 'default',
      'Content-Type': 'application/json',
    },
    data: { username, password },
    ignoreHTTPSErrors: true,
  });
  return ((await res.json()).permissions ?? []) as string[];
}

export { fineractGet };
