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
import type { SearchApi, SearchHit, SearchHitType } from './search.api';

/** A search result as the server sends it (`GetSearchResponse`). */
export interface SearchHitPayload {
  readonly entityId?: number;
  readonly entityType?: string;
  readonly entityName?: string;
  readonly entityAccountNo?: string;
  readonly parentName?: string;
}

const TYPES: Record<string, SearchHitType> = {
  CLIENT: 'client',
  LOAN: 'loan',
  SAVINGSACCOUNT: 'savings',
};

/** Exported for its own test. A record type the app cannot open answers `null`. */
export function mapSearchHit(payload: SearchHitPayload): SearchHit | null {
  const type = payload.entityType === undefined ? undefined : TYPES[payload.entityType];
  if (!type) return null;
  return {
    id: required(payload.entityId, 'search result', 'id'),
    type,
    name: payload.entityName ?? '',
    accountNo: payload.entityAccountNo || null,
    officeName: payload.parentName || null,
  };
}

export class HttpSearchApi implements SearchApi {
  constructor(private readonly client: ApiClient) {}

  async search(query: string): Promise<readonly SearchHit[]> {
    const list = await call(
      this.client.GET('/v1/search', {
        params: { query: { query, resource: 'clients,loans,savings' } },
      }),
    );
    return ((list ?? []) as SearchHitPayload[])
      .map(mapSearchHit)
      .filter((h): h is SearchHit => h !== null);
  }
}
