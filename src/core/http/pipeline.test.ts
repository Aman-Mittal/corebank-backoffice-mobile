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

import {
  auth,
  isApiRequest,
  LEGACY_TENANT_HEADER,
  TENANT_HEADER,
  TFA_HEADER,
  type AuthState,
} from './auth';
import { CORRELATION_HEADER, correlationId } from './correlation-id';
import { compose, IDEMPOTENT_HEADER, type FetchFn } from './pipeline';
import { retry, RequestTimeoutError } from './retry';
import { sessionExpiry } from './session-expiry';

const API = 'https://bank.test/fineract-provider/api';

/** A fake network that records every request it receives and answers from a script. */
function network(...answers: (number | Error)[]) {
  const seen: Request[] = [];
  const fetch: FetchFn = async (req) => {
    seen.push(req);
    const next = answers.length > 1 ? answers.shift()! : answers[0]!;
    if (next instanceof Error) throw next;
    return new Response(null, { status: next });
  };
  return { seen, fetch };
}

const signedIn: AuthState = {
  tenantId: 'default',
  credential: { scheme: 'Basic', value: 'bWlmb3M6cGFzc3dvcmQ=' },
  tfaToken: null,
};

describe('isApiRequest', () => {
  it.each([
    [`${API}/v1/clients`, true],
    ['https://bank.test/other/path', true],
    ['https://evil.test/v1/clients', false],
    ['http://bank.test/v1/clients', false],
    ['not a url', false],
  ])('%s → %s', (url, expected) => expect(isApiRequest(url, API)).toBe(expected));
});

describe('auth middleware', () => {
  it('adds tenant headers, the credential and the TFA token to API requests', async () => {
    const net = network(200);
    const run = auth(
      () => ({ ...signedIn, tfaToken: 'tfa-1' }),
      () => API,
    )(net.fetch);
    await run(new Request(`${API}/v1/offices`));
    const h = net.seen[0]!.headers;
    expect(h.get(TENANT_HEADER)).toBe('default');
    expect(h.get(LEGACY_TENANT_HEADER)).toBe('default');
    expect(h.get('Authorization')).toBe('Basic bWlmb3M6cGFzc3dvcmQ=');
    expect(h.get(TFA_HEADER)).toBe('tfa-1');
  });

  it('sends nothing to a foreign host', async () => {
    const net = network(200);
    await auth(
      () => signedIn,
      () => API,
    )(net.fetch)(new Request('https://cdn.test/x.js'));
    const h = net.seen[0]!.headers;
    expect(h.has('Authorization')).toBe(false);
    expect(h.has(TENANT_HEADER)).toBe(false);
  });

  it('keeps a tenant the caller set (sign-in with a typed tenant)', async () => {
    const net = network(200);
    const req = new Request(`${API}/v1/authentication`, {
      method: 'POST',
      headers: { [TENANT_HEADER]: 'typed' },
    });
    await auth(
      () => ({ ...signedIn, credential: null }),
      () => API,
    )(net.fetch)(req);
    expect(net.seen[0]!.headers.get(TENANT_HEADER)).toBe('typed');
    expect(net.seen[0]!.headers.has('Authorization')).toBe(false);
  });
});

describe('correlationId middleware', () => {
  it('adds an id, and keeps one already present', async () => {
    const net = network(200);
    const run = correlationId(() => 'generated')(net.fetch);
    await run(new Request(`${API}/v1/a`));
    await run(new Request(`${API}/v1/b`, { headers: { [CORRELATION_HEADER]: 'mine' } }));
    expect(net.seen.map((r) => r.headers.get(CORRELATION_HEADER))).toEqual(['generated', 'mine']);
  });
});

describe('sessionExpiry middleware', () => {
  it('fires on a 401 to a request that carried credentials, not on a failed sign-in', async () => {
    const onExpired = vi.fn();
    const run = sessionExpiry(onExpired)(network(401).fetch);
    await run(new Request(`${API}/v1/authentication`, { method: 'POST' }));
    expect(onExpired).not.toHaveBeenCalled();
    await run(new Request(`${API}/v1/clients`, { headers: { Authorization: 'Basic x' } }));
    expect(onExpired).toHaveBeenCalledTimes(1);
  });
});

describe('retry middleware', () => {
  const sleep = vi.fn(async () => undefined);
  beforeEach(() => sleep.mockClear());

  it('retries a GET on transient statuses with 300ms then 900ms backoff', async () => {
    const net = network(503, 502, 200);
    const res = await retry({ sleep })(net.fetch)(new Request(`${API}/v1/a`));
    expect(res.status).toBe(200);
    expect(net.seen).toHaveLength(3);
    expect(sleep.mock.calls).toEqual([[300], [900]]);
  });

  it('gives up after the budget and returns the last response', async () => {
    const net = network(503);
    const res = await retry({ sleep })(net.fetch)(new Request(`${API}/v1/a`));
    expect(res.status).toBe(503);
    expect(net.seen).toHaveLength(3);
  });

  it('does not retry a 500 or a 4xx', async () => {
    for (const status of [500, 400, 404]) {
      const net = network(status);
      await retry({ sleep })(net.fetch)(new Request(`${API}/v1/a`));
      expect(net.seen).toHaveLength(1);
    }
  });

  it('never repeats a POST unless the call site declares it idempotent, and strips the marker', async () => {
    const plain = network(503);
    await retry({ sleep })(plain.fetch)(new Request(`${API}/v1/a`, { method: 'POST', body: '{}' }));
    expect(plain.seen).toHaveLength(1);

    const declared = network(503, 200);
    await retry({ sleep })(declared.fetch)(
      new Request(`${API}/v1/a`, {
        method: 'POST',
        body: '{"x":1}',
        headers: { [IDEMPOTENT_HEADER]: 'true' },
      }),
    );
    expect(declared.seen).toHaveLength(2);
    expect(await declared.seen[1]!.text()).toBe('{"x":1}');
    expect(declared.seen.every((r) => !r.headers.has(IDEMPOTENT_HEADER))).toBe(true);
  });

  it('retries a network failure, then rethrows it', async () => {
    const net = network(new TypeError('fetch failed'));
    await expect(retry({ sleep })(net.fetch)(new Request(`${API}/v1/a`))).rejects.toThrow(
      'fetch failed',
    );
    expect(net.seen).toHaveLength(3);
  });

  it('applies the deadline per attempt and does not retry a timeout', async () => {
    let calls = 0;
    const never: FetchFn = () => {
      calls += 1;
      return new Promise<Response>(() => undefined);
    };
    await expect(
      retry({ sleep, timeoutMs: 10 })(never)(new Request(`${API}/v1/a`)),
    ).rejects.toBeInstanceOf(RequestTimeoutError);
    expect(calls).toBe(1);
  });
});

describe('compose', () => {
  it('runs middleware in the listed order', async () => {
    const order: string[] = [];
    const tag =
      (name: string) =>
      (next: FetchFn): FetchFn =>
      (req) => {
        order.push(name);
        return next(req);
      };
    await compose(tag('a'), tag('b'), tag('c'))(network(200).fetch)(new Request(`${API}/v1/a`));
    expect(order).toEqual(['a', 'b', 'c']);
  });
});
