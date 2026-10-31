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

import { token } from '../registry';

/** The record types the search answers that this app can open. */
export type SearchHitType = 'client' | 'loan' | 'savings';

export interface SearchHit {
  readonly id: number;
  readonly type: SearchHitType;
  readonly name: string;
  readonly accountNo: string | null;
  /** The office the record belongs to; `null` when the server does not say. */
  readonly officeName: string | null;
}

/** Record search (DOCS/test-plan/P1-14-search-breadcrumbs.md). */
export interface SearchApi {
  /** Clients, loans and savings accounts matching `query`, in the server's order. */
  search(query: string): Promise<readonly SearchHit[]>;
}

export const SEARCH_API = token<SearchApi>('SearchApi');
