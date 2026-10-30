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

import type { APIRequestContext } from '@playwright/test';

import { fineractPost, runId } from '../fineract-api';

/**
 * Creates a branch under the head office through the REST API, opened before any seeded client
 * was activated, and answers its id and name. Written for this project.
 */
export async function createBranch(request: APIRequestContext) {
  const name = `E2E Branch ${runId()}`;
  const res = await fineractPost(request, '/v1/offices', {
    name,
    parentId: 1,
    openingDate: '2020-01-01',
    dateFormat: 'yyyy-MM-dd',
    locale: 'en',
  });
  if (!res.ok()) throw new Error(`POST /offices answered ${res.status()}: ${await res.text()}`);
  return { officeId: (await res.json()).resourceId as number, name };
}
