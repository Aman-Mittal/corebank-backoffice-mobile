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

import { AppError } from '@/core/http/app-error';

/** The i18n key for why sign-in failed. Only `unauthorized` means the credentials were wrong. */
export function signInErrorKey(error: unknown): string {
  if (!(error instanceof AppError)) return 'COMMON.ERRORS.UNKNOWN';
  switch (error.kind) {
    case 'unauthorized':
      return 'AUTH.ERRORS.INVALID_CREDENTIALS';
    case 'network':
    case 'timeout':
      return 'COMMON.ERRORS.NETWORK';
    default:
      return 'COMMON.ERRORS.UNKNOWN';
  }
}
