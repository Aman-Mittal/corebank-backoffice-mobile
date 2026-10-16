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

import { token } from '../registry';
import type { Session } from './auth.api';

/** Thrown when the server cannot turn an identity-provider token into a session. */
export class OidcUnsupportedError extends Error {
  constructor(readonly status: number) {
    super(`The server cannot complete identity-provider sign-in (HTTP ${status})`);
    this.name = 'OidcUnsupportedError';
  }
}

export interface UserDetailsApi {
  /**
   * The session an identity-provider access token stands for, from `GET /userdetails`.
   * Rejects with {@link OidcUnsupportedError} when the server has no such endpoint (404) or does
   * not accept the token (401/403) — see DOCS/test-plan/P1-03-two-factor-oidc.md.
   */
  sessionFor(accessToken: string, tenantId: string): Promise<Session>;
}

export const USER_DETAILS_API = token<UserDetailsApi>('UserDetailsApi');
