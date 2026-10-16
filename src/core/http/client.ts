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

import createClient, { type Client } from 'openapi-fetch';

import type { paths } from '@/api/generated/openapi';

import { auth, type AuthState } from './auth';
import { correlationId, CORRELATION_HEADER } from './correlation-id';
import { compose, type FetchFn } from './pipeline';
import { retry, type RetryOptions } from './retry';
import { sessionExpiry } from './session-expiry';
import { AppError, toAppError, toNetworkError } from './app-error';

const PLACEHOLDER_BASE = 'https://api-base.invalid';
const trimSlash = (s: string) => s.replace(/\/+$/, '');

/** The typed API client. Only `src/core/adapters/api/**` may use it (lint rule). */
export type ApiClient = Client<paths>;

export interface ApiClientOptions {
  /** e.g. `https://bank.example/fineract-provider/api` — the generated paths start at `/v1`. */
  readonly baseUrl: () => string;
  readonly authState: () => AuthState;
  readonly onSessionExpired: () => void;
  readonly newCorrelationId: () => string;
  readonly retry?: RetryOptions;
  readonly fetch?: FetchFn;
}

/**
 * Builds the client with the pipeline in its fixed order. The base URL is read per request, so a
 * server switch on the login screen takes effect without rebuilding anything.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const base: FetchFn = options.fetch ?? ((request) => globalThis.fetch(request));
  const pipeline = compose(
    correlationId(options.newCorrelationId),
    auth(options.authState, options.baseUrl),
    sessionExpiry(options.onSessionExpired),
    retry(options.retry),
  )(base);

  const client = createClient<paths>({
    baseUrl: PLACEHOLDER_BASE,
    // openapi-fetch fixes `baseUrl` at creation, so the real base is substituted per request.
    fetch: async (request: Request) =>
      pipeline(await rebase(request, trimSlash(options.baseUrl()))),
  });
  return client;
}

/**
 * Re-points a request at the current base URL.
 *
 * The body is read into memory and re-attached rather than passed through as `new Request(url,
 * request)`: browsers would then send it as a stream, which Chrome only allows over HTTP/2 with
 * `duplex: 'half'`, and the server received an empty body. The web e2e sign-in spec found this;
 * API bodies are small JSON, so buffering costs nothing.
 */
async function rebase(request: Request, base: string): Promise<Request> {
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(request.url.replace(PLACEHOLDER_BASE, base), {
    method: request.method,
    headers: request.headers,
    body: hasBody ? await request.arrayBuffer() : null,
    signal: request.signal,
  });
}

/** The result shape every openapi-fetch call returns. */
interface FetchResult<T> {
  readonly data?: T;
  readonly error?: unknown;
  readonly response: Response;
}

/**
 * Unwraps an openapi-fetch result into its data, or throws an {@link AppError}.
 *
 * Adapters `await call(client.GET(...))` and so never see a `{ data, error }` pair; a rejection
 * from `fetch` itself (no connection) becomes a `network` AppError the same way.
 */
export async function call<T>(pending: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await pending;
  } catch (error) {
    throw toNetworkError(error);
  }
  if (result.response.ok) return result.data as T;
  throw toAppError(
    result.response.status,
    result.error,
    result.response.headers.get(CORRELATION_HEADER),
  );
}

export { AppError };
