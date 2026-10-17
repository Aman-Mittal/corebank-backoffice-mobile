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

import { createEntityClient } from '../../../shared/factories/clients';
import { runId } from '../../../shared/fineract-api';
import { expect, spec, test } from '../../fixtures';
import { ClientFormPage, ClientPage, ClientsPage } from '../../pages/clients.page';
import { LoginPage } from '../../pages/login.page';

test.describe('clients against the backend', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
  });

  test('an entity client is found in the list and opens', async ({ page, request }) => {
    spec('P1-CLIENTS-005/1');
    const { fullname, clientId } = await createEntityClient(request);
    const list = new ClientsPage(page);
    await list.open();
    await list.search.fill(fullname);
    await expect(list.rows).toHaveCount(1);
    await list.row(clientId).click();
    const view = new ClientPage(page);
    await expect(view.name).toHaveText(fullname);
    await expect(view.legalForm).toContainText('Entity');
  });

  test('a person created through the form opens as active and is listed', async ({ page }) => {
    spec('P1-CLIENTS-009/6');
    const lastname = `E2E${runId()}`;
    const list = new ClientsPage(page);
    await list.open();
    await list.create.click();
    const form = new ClientFormPage(page);
    await form.office.choose(1);
    await form.firstname.fill('Ada');
    await form.lastname.fill(lastname);
    await form.submittedOn.fill('2026-01-05');
    await form.activationDate.fill('2026-01-05');
    await form.submit.click();
    const view = new ClientPage(page);
    await expect(view.name).toHaveText(`Ada ${lastname}`);
    await expect(view.status).toContainText('Active');
    await list.open();
    await list.search.fill(lastname);
    await expect(list.rows).toHaveCount(1);
  });
});
