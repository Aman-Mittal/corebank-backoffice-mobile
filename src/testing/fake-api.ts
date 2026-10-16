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

import { createApiClient, type ApiClient } from '@/core/http/client';
import type { FetchFn } from '@/core/http/pipeline';

export const TEST_API = 'https://bank.test/fineract-provider/api';

export interface RecordedRequest {
  readonly method: string;
  readonly path: string;
  readonly query: URLSearchParams;
  readonly headers: Headers;
  readonly body: unknown;
}

/**
 * A real `ApiClient` (the full pipeline) over a scripted fetch, for adapter tests. Routes are
 * `METHOD /v1/path` → [status, body]; an unscripted call answers 501 so a test that forgot a
 * route fails on it.
 */
export function fakeApi(
  routes: Record<string, [number, unknown] | ((body: unknown) => [number, unknown])>,
) {
  const requests: RecordedRequest[] = [];
  const fetch: FetchFn = async (request) => {
    const url = new URL(request.url);
    const path = url.pathname.replace(new URL(TEST_API).pathname, '');
    const text = await request.text();
    const body = text ? JSON.parse(text) : null;
    requests.push({
      method: request.method,
      path,
      query: url.searchParams,
      headers: request.headers,
      body,
    });
    const route = routes[`${request.method} ${path}`];
    const [status, answer] =
      typeof route === 'function'
        ? route(body)
        : (route ?? [501, { developerMessage: 'unscripted' }]);
    return Response.json(answer, { status });
  };
  const client: ApiClient = createApiClient({
    baseUrl: () => TEST_API,
    authState: () => ({
      tenantId: 'default',
      credential: { scheme: 'Basic', value: 'k' },
      tfaToken: null,
    }),
    onSessionExpired: () => undefined,
    newCorrelationId: () => 'cid',
    retry: { sleep: async () => undefined },
    fetch,
  });
  return { client, requests };
}
