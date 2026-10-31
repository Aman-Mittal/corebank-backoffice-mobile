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

import { createPersonClient } from '../../../shared/factories/clients';
import { expect, spec, test } from '../../fixtures';
import { ClientPage } from '../../pages/clients.page';
import { LoginPage } from '../../pages/login.page';
import { SearchPage } from '../../pages/search.page';

test.describe('global search against the backend', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
  });

  test('a client is found by a unique name and opened', async ({ page, request }) => {
    spec('P1-SHELL-014/4');
    const { clientId, displayName } = await createPersonClient(request, { active: true });
    const screen = new SearchPage(page);
    await screen.open();
    await screen.query.fill(displayName.split(' ').pop()!);
    await screen.result('client', clientId).click();
    await expect(page).toHaveURL((url) => url.pathname === `/clients/${clientId}`);
    await expect(new ClientPage(page).name).toHaveText(displayName);
  });
});
