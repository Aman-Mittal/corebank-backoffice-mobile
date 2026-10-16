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

import { token } from './adapters/registry';
import type { SessionStore } from './auth/session-store';
import type { AuthState } from './http/auth';
import type { ApiClient } from './http/client';

/*
 * Application-level tokens, kept apart from the composition root so a screen or test can import
 * them without pulling in every platform module the root wires up.
 */

/** The typed HTTP client, as an adapter so API contracts can depend on it. */
export const API_CLIENT = token<ApiClient>('ApiClient');

/** Who is signed in. */
export const SESSION = token<SessionStore>('SessionStore');

/** The session's credentials, as the HTTP pipeline reads them (from SESSION by default). */
export const AUTH_STATE = token<() => AuthState>('AuthState');

/** Called when the server rejects an established session. */
export const SESSION_EXPIRED = token<() => void>('SessionExpired');
