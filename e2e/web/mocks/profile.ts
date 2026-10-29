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

import type { Request } from '@playwright/test';

import type { Handler } from './api';

/** `GET /users/{id}` as the server sends it (DOCS/test-plan/P1-10-profile-state.md). */
export const USERS: Record<number, Record<string, unknown>> = {
  1: {
    id: 1,
    username: 'mifos',
    firstname: 'App',
    lastname: 'Administrator',
    email: 'mifos@example.org',
    officeId: 1,
    officeName: 'Head Office',
    passwordNeverExpires: true,
    selectedRoles: [{ id: 1, name: 'Super user' }],
    availableRoles: [],
  },
  7: {
    id: 7,
    username: 'clerk',
    firstname: 'Clara',
    lastname: 'Clerk',
    email: 'clara@example.org',
    officeId: 2,
    officeName: 'Kampala Branch',
    passwordNeverExpires: false,
    selectedRoles: [{ id: 3, name: 'Clerk' }],
    availableRoles: [],
  },
};

export const POLICY = 'Password must be at least 6 characters';

const userIdOf = (req: Request) => Number(/\/users\/(\d+)/.exec(new URL(req.url()).pathname)?.[1]);

const refusal = (message: string, parameterName: string) => ({
  status: 400,
  body: {
    developerMessage: 'Validation errors exist.',
    defaultUserMessage: 'Validation errors exist.',
    userMessageGlobalisationCode: 'validation.msg.validation.errors.exist',
    errors: [
      {
        developerMessage: message,
        defaultUserMessage: message,
        userMessageGlobalisationCode: `validation.msg.user.${parameterName}.invalid`,
        parameterName,
      },
    ],
  },
});

/**
 * The profile screen's backend: each user's record, the active password policy, and a password
 * change that accepts matching passwords of six or more characters.
 */
export function profileHandlers({
  failProfileOnce = false,
  noPolicy = false,
}: { failProfileOnce?: boolean; noPolicy?: boolean } = {}): Record<string, Handler> {
  let failNext = failProfileOnce;
  const read: Handler = (req) => {
    if (failNext) {
      failNext = false;
      return { status: 500, body: { developerMessage: 'Internal error' } };
    }
    const user = USERS[userIdOf(req)];
    return user ? { status: 200, body: user } : { status: 404, body: {} };
  };
  const change: Handler = (req) => {
    const body = req.postDataJSON() as { password?: string; repeatPassword?: string };
    if (body.password !== body.repeatPassword)
      return refusal('The two passwords do not match.', 'repeatPassword');
    if ((body.password ?? '').length < 6) return refusal(POLICY, 'password');
    return { status: 200, body: { resourceId: userIdOf(req) } };
  };
  return {
    'GET /v1/users/1': read,
    'GET /v1/users/7': read,
    'POST /v1/users/1/pwd': change,
    'POST /v1/users/7/pwd': change,
    'GET /v1/passwordpreferences': () =>
      noPolicy
        ? { status: 403, body: { developerMessage: 'Forbidden' } }
        : { status: 200, body: { id: 1, description: POLICY, active: true, key: 'simple' } },
  };
}
