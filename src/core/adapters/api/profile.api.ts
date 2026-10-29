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

/** The signed-in user's own record, as the profile screen shows it. */
export interface UserProfile {
  readonly id: number;
  readonly username: string;
  readonly firstname: string | null;
  readonly lastname: string | null;
  readonly email: string | null;
  readonly officeId: number | null;
  readonly officeName: string | null;
  /** Role names, in the server's order. */
  readonly roles: readonly string[];
}

export interface PasswordChange {
  readonly password: string;
  readonly repeatPassword: string;
}

export interface ProfileApi {
  /** `GET /users/{id}`: present on every server build, unlike `GET /userdetails`. */
  get(userId: number): Promise<UserProfile>;
  /** The active password policy's description, or `null` when none is active. */
  passwordPolicy(): Promise<string | null>;
  /** `POST /users/{id}/pwd`. Rejects with the server's reason when it refuses. */
  changePassword(userId: number, change: PasswordChange): Promise<void>;
}

export const PROFILE_API = token<ProfileApi>('ProfileApi');
