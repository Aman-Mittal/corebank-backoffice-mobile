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

/**
 * Ends the session when the server stops accepting it.
 *
 * Only a 401 on a request that *carried* credentials counts: the sign-in request is the one
 * request that legitimately 401s, and treating that as an expiry would sign the user out of a
 * session they never had (fineract-backoffice-ui, `errorInterceptor`).
 */
export function sessionExpiry(onExpired: () => void): Middleware {
  return (next) => async (request) => {
    const response = await next(request);
    if (response.status === 401 && request.headers.has('Authorization')) onExpired();
    return response;
  };
}
