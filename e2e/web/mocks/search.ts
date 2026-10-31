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

import type { Handler } from './api';

const OFFICE = { parentId: 1, parentName: 'Head Office' };

/**
 * Ada's records, as `GET /search` answers them: clients as captured from the e2e stack
 * (`stack.search.json`), loans and savings in the same shape (DOCS/test-plan/P1-14-…md).
 */
export const ADA_HITS = [
  {
    entityId: 11,
    entityAccountNo: '000000011',
    entityName: 'Ada Lovelace',
    entityType: 'CLIENT',
    ...OFFICE,
    entityStatus: { id: 300, code: 'clientStatusType.active', value: 'Active' },
  },
  {
    entityId: 22,
    entityAccountNo: '000000022',
    entityName: 'Ada Lovelace - Loan',
    entityType: 'LOAN',
    ...OFFICE,
  },
  {
    entityId: 33,
    entityAccountNo: '000000033',
    entityName: 'Ada Lovelace - Savings',
    entityType: 'SAVINGSACCOUNT',
    ...OFFICE,
  },
];

/** `GET /search`: Ada's records for any query containing "ada"; `queries` records each one. */
export function searchHandlers(options: { failSearch?: boolean } = {}) {
  const queries: { query: string; resource: string }[] = [];
  const handlers: Record<string, Handler> = {
    'GET /v1/search': (req) => {
      const q = new URL(req.url()).searchParams;
      queries.push({ query: q.get('query') ?? '', resource: q.get('resource') ?? '' });
      if (options.failSearch) return { status: 500, body: { developerMessage: 'boom' } };
      const hit = (q.get('query') ?? '').toLowerCase().includes('ada');
      return { status: 200, body: hit ? ADA_HITS : [] };
    },
  };
  return { handlers, queries };
}
