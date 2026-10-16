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

import { call, type ApiClient } from '@/core/http/client';

import { required } from './required';
import type { DeliveryMethod, TwoFactorApi } from './two-factor.api';

/** `GET /twofactor` items. The spec does not type the response body. */
type MethodPayload = { readonly name?: string; readonly target?: string };

export function mapMethods(payload: unknown): DeliveryMethod[] {
  if (!Array.isArray(payload)) return [];
  return (payload as MethodPayload[]).flatMap((m) =>
    typeof m?.name === 'string' && m.name.length > 0
      ? [{ name: m.name, target: m.target ?? '' }]
      : [],
  );
}

export class HttpTwoFactorApi implements TwoFactorApi {
  constructor(private readonly client: ApiClient) {}

  async methods(): Promise<DeliveryMethod[]> {
    return mapMethods(await call(this.client.GET('/v1/twofactor')));
  }

  async request(method: string): Promise<void> {
    await call(
      this.client.POST('/v1/twofactor', { params: { query: { deliveryMethod: method } } }),
    );
  }

  async validate(code: string): Promise<string> {
    const body = (await call(
      this.client.POST('/v1/twofactor/validate', { params: { query: { token: code } } }),
    )) as { token?: string } | null;
    return required(body?.token, 'a two-factor validation', 'token');
  }

  async invalidate(tfaToken: string): Promise<void> {
    await call(
      this.client.POST('/v1/twofactor/invalidate', { body: { token: tfaToken } as never }),
    );
  }
}
