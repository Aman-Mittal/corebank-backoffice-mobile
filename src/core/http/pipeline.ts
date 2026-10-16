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

/**
 * The HTTP pipeline: middleware over `fetch`.
 *
 * openapi-fetch accepts a custom `fetch`, so the interceptor chain from fineract-backoffice-ui
 * becomes a composition of functions with the same order and the same reasons:
 *
 *   correlationId → auth → sessionExpiry → retry → fetch
 *
 * `retry` sits closest to the network so every attempt carries the same correlation id and
 * credentials, and `sessionExpiry` sees only the final outcome, not each attempt.
 */
export type FetchFn = (request: Request) => Promise<Response>;
export type Middleware = (next: FetchFn) => FetchFn;

/** Composes middleware left to right: the first listed sees the request first. */
export function compose(...middleware: readonly Middleware[]): (base: FetchFn) => FetchFn {
  return (base) => middleware.reduceRight<FetchFn>((next, mw) => mw(next), base);
}

/**
 * Header a call site sets to declare a non-GET request safe to send twice.
 *
 * Read and stripped by `retry`, so it never reaches the server. Only an explicit claim turns
 * retries on for a write: a POST that timed out may already have been applied.
 */
export const IDEMPOTENT_HEADER = 'x-cbo-idempotent';
