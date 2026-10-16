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

import type { Middleware } from './pipeline';

export const CORRELATION_HEADER = 'X-Correlation-ID';

/**
 * Tags each logical request with an id the server logs, so a failure a user reports can be
 * found in the server log. An id already present (set by a caller) is kept.
 */
export function correlationId(generate: () => string): Middleware {
  return (next) => (request) => {
    if (!request.headers.has(CORRELATION_HEADER)) {
      request.headers.set(CORRELATION_HEADER, generate());
    }
    return next(request);
  };
}
