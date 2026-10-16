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

/** Who signed in, and what they may do. Non-secret; held in memory and in secure storage. */
export interface Session {
  readonly userId: number;
  readonly username: string;
  readonly displayName: string | null;
  readonly officeId: number;
  readonly officeName: string;
  readonly tenantId: string;
  /** Permission codes, upper-cased. `ALL_FUNCTIONS` grants everything. */
  readonly permissions: readonly string[];
  readonly roles: readonly string[];
  /** The `Basic` key the server issued, or an identity provider's access token. */
  readonly credential: string;
  readonly scheme: 'Basic' | 'Bearer';
  /** The second-factor token, once validated; sent as `Fineract-Platform-TFA-Token`. */
  readonly tfaToken: string | null;
  /** The server requires a second factor before anything else will be accepted. */
  readonly twoFactorRequired: boolean;
  /** The server requires a password change before anything else. */
  readonly passwordRenewalRequired: boolean;
}

export interface SignInRequest {
  readonly username: string;
  readonly password: string;
  readonly tenantId: string;
}

export interface AuthApi {
  /** Exchanges credentials for a session. Rejects with an `AppError` of kind `unauthorized`. */
  signIn(request: SignInRequest): Promise<Session>;
}

export const AUTH_API = token<AuthApi>('AuthApi');
