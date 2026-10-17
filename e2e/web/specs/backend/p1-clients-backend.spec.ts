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

import {
  createEntityClient,
  createPersonClient,
  ensureCodeValue,
} from '../../../shared/factories/clients';
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

  test('a pending client is rejected with a reason', async ({ page, request }) => {
    spec('P1-CLIENTS-014/3');
    await ensureCodeValue(request, 'ClientRejectReason', 'E2E rejection reason');
    const { clientId } = await createPersonClient(request, { active: false });
    const view = new ClientPage(page);
    await view.open(clientId);
    await expect(view.status).toContainText('Pending');
    await view.action('reject').click();
    await view.actionDate.fill('2026-01-06');
    await view.actionReason.trigger.click();
    await page.getByText('E2E rejection reason').filter({ visible: true }).click();
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Rejected');
  });

  test('an active client is closed, then reactivated', async ({ page, request }) => {
    spec('P1-CLIENTS-017/5');
    await ensureCodeValue(request, 'ClientClosureReason', 'E2E closure reason');
    const { clientId } = await createPersonClient(request, { active: true });
    const view = new ClientPage(page);
    await view.open(clientId);
    await expect(view.status).toContainText('Active');
    await view.action('close').click();
    await view.actionDate.fill('2026-01-07');
    await view.actionReason.trigger.click();
    await page.getByText('E2E closure reason').filter({ visible: true }).click();
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Closed');
    await view.action('reactivate').click();
    await view.actionDate.fill('2026-01-08');
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Pending');
  });
});
