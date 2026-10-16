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

import { expect, test as setup } from '@playwright/test';

import { apiBaseUrl, fineractGet } from '../../shared/fineract-api';

/** Fails fast, with a useful message, when the backend stack is not up. */
setup('backend is reachable', async ({ request }) => {
  const res = await fineractGet(request, '/v1/offices');
  expect(
    res.ok(),
    `GET ${apiBaseUrl()}/v1/offices answered ${res.status()}; is \`npm run e2e:stack\` up?`,
  ).toBe(true);
});
