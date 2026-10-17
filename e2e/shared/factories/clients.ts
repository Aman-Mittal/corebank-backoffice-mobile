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
 * Creates an entity client (legal form 2) in the head office through the REST API, pending, so
 * no dates are needed: the server defaults the submitted-on date. Written for this project.
 */
export async function createEntityClient(request: APIRequestContext) {
  const fullname = `E2E Entity ${runId()} Ltd`;
  const res = await fineractPost(request, '/v1/clients', {
    officeId: 1,
    legalFormId: 2,
    fullname,
    active: false,
    locale: 'en',
    dateFormat: 'yyyy-MM-dd',
  });
  if (!res.ok()) throw new Error(`POST /clients answered ${res.status()}: ${await res.text()}`);
  return { fullname, clientId: (await res.json()).clientId as number };
}
