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

/** Where a one-time code can be sent: `email` → `a***@example.org`. */
export interface DeliveryMethod {
  readonly name: string;
  readonly target: string;
}

/**
 * The second sign-in factor. Every call is made with the Basic credential of a session that is
 * still pending its second factor; the backend opens `/twofactor/**` and nothing else to it.
 */
export interface TwoFactorApi {
  methods(): Promise<DeliveryMethod[]>;
  /** Sends a code through the named channel. */
  request(method: string): Promise<void>;
  /** Exchanges a code for the session's TFA token. A refused code rejects (`domainRule`). */
  validate(code: string): Promise<string>;
  /** Makes a TFA token unusable at the server. */
  invalidate(tfaToken: string): Promise<void>;
}

export const TWO_FACTOR_API = token<TwoFactorApi>('TwoFactorApi');
