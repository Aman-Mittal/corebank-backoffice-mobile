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

import { AppError } from './app-error';
import { TENANT_HEADER } from './auth';
import { call, createApiClient } from './client';
import type { FetchFn } from './pipeline';

const json = (status: number, body: unknown) => Response.json(body, { status });

function setup(answer: (req: Request) => Response) {
  const seen: Request[] = [];
  let base = 'https://one.test/fineract-provider/api';
  const fetch: FetchFn = async (req) => {
    seen.push(req);
    return answer(req);
  };
  const onSessionExpired = vi.fn();
  const client = createApiClient({
    baseUrl: () => base,
    authState: () => ({
      tenantId: 'default',
      credential: { scheme: 'Basic', value: 'k' },
      tfaToken: null,
    }),
    onSessionExpired,
    newCorrelationId: () => 'cid',
    retry: { sleep: async () => undefined },
    fetch,
  });
  return { client, seen, onSessionExpired, setBase: (b: string) => void (base = b) };
}

describe('createApiClient', () => {
  it('sends typed requests to the current base URL with the pipeline applied', async () => {
    const t = setup(() => json(200, [{ id: 1, name: 'Head Office' }]));
    const offices = await call(t.client.GET('/v1/offices'));
    expect(offices).toEqual([{ id: 1, name: 'Head Office' }]);
    expect(t.seen[0]!.url).toBe('https://one.test/fineract-provider/api/v1/offices');
    expect(t.seen[0]!.headers.get(TENANT_HEADER)).toBe('default');
    expect(t.seen[0]!.headers.get('Authorization')).toBe('Basic k');

    t.setBase('https://two.test/api/');
    await call(t.client.GET('/v1/offices'));
    expect(t.seen[1]!.url).toBe('https://two.test/api/v1/offices');
  });

  it('turns an error response into an AppError and reports an expired session', async () => {
    const t = setup(() => json(401, { developerMessage: 'Unauthenticated' }));
    const error = await call(t.client.GET('/v1/offices')).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).kind).toBe('unauthorized');
    expect(t.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('turns a rejected fetch into a network AppError', async () => {
    const t = setup(() => {
      throw new TypeError('fetch failed');
    });
    const error = await call(t.client.GET('/v1/offices')).catch((e: unknown) => e);
    expect((error as AppError).kind).toBe('network');
  });

  it('carries a JSON body through to the server', async () => {
    const t = setup(() => json(200, { resourceId: 5 }));
    await call(
      t.client.POST('/v1/offices', {
        body: {
          name: 'Branch',
          openingDate: '2026-01-01',
          dateFormat: 'yyyy-MM-dd',
          locale: 'en',
          parentId: 1,
        },
      }),
    );
    expect(t.seen[0]!.method).toBe('POST');
    expect(JSON.parse(await t.seen[0]!.text())).toMatchObject({ name: 'Branch' });
  });
});
