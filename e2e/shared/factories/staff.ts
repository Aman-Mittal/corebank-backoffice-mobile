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
 * Creates an active loan officer in the head office through the REST API, and answers its id and
 * the display name the server builds ("Lastname, Firstname"). Written for this project.
 */
export async function createLoanOfficer(request: APIRequestContext) {
  const lastname = `E2E${runId()}`;
  const res = await fineractPost(request, '/v1/staff', {
    officeId: 1,
    firstname: 'Loan',
    lastname,
    isLoanOfficer: true,
    isActive: true,
    joiningDate: '2026-01-02',
    dateFormat: 'yyyy-MM-dd',
    locale: 'en',
  });
  if (!res.ok()) throw new Error(`POST /staff answered ${res.status()}: ${await res.text()}`);
  return { staffId: (await res.json()).resourceId as number, displayName: `${lastname}, Loan` };
}
