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

import { clientCommand, createPersonClient } from '../../../shared/factories/clients';
import { createBranch } from '../../../shared/factories/offices';
import { expect, spec, test } from '../../fixtures';
import { ClientPage } from '../../pages/clients.page';
import { LoginPage } from '../../pages/login.page';

/** Client transfers, with the real server deciding what is accepted. */
test.describe('client transfer against the backend', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
  });

  test('a proposed transfer is accepted and the client moves', async ({ page, request }) => {
    spec('P1-CLIENTS-008/6');
    const branch = await createBranch(request);
    const { clientId } = await createPersonClient(request, { active: true });
    const view = new ClientPage(page);
    await view.open(clientId);
    await view.transfer('proposeTransfer').click();
    await view.transferOffice.choose(branch.officeId);
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Transfer in progress');
    await expect(view.transferTo).toContainText(branch.name);
    await view.transfer('acceptTransfer').click();
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Active');
    await expect(view.office).toContainText(branch.name);
  });

  test('a rejected transfer is withdrawn', async ({ page, request }) => {
    spec('P1-CLIENTS-008/7');
    const branch = await createBranch(request);
    const { clientId } = await createPersonClient(request, { active: true });
    await clientCommand(request, clientId, 'proposeTransfer', {
      destinationOfficeId: branch.officeId,
      transferDate: '2026-02-01',
    });
    const view = new ClientPage(page);
    await view.open(clientId);
    await view.transfer('rejectTransfer').click();
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Transfer on hold');
    await view.transfer('withdrawTransfer').click();
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Active');
    await expect(view.office).toContainText('Head Office');
  });

  test('a client is transferred in one step', async ({ page, request }) => {
    spec('P1-CLIENTS-008/8');
    const branch = await createBranch(request);
    const { clientId } = await createPersonClient(request, { active: true });
    const view = new ClientPage(page);
    await view.open(clientId);
    await view.transfer('proposeAndAcceptTransfer').click();
    await view.transferOffice.choose(branch.officeId);
    await view.transferConfirm.click();
    await expect(view.office).toContainText(branch.name);
    await expect(view.status).toContainText('Active');
  });
});
