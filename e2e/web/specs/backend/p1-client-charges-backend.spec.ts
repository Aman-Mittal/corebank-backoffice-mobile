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
  addClientCharge,
  createPersonClient,
  ensureClientCharge,
} from '../../../shared/factories/clients';
import { expect, spec, test } from '../../fixtures';
import { ChargesPage } from '../../pages/charges.page';
import { LoginPage } from '../../pages/login.page';

/** The client charge scenarios, with the real server deciding what is accepted. */
test.describe('client charges against the backend', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
  });

  test('a charge is added from the screen', async ({ page, request }) => {
    spec('P1-CLIENTS-001/5');
    const chargeId = await ensureClientCharge(request);
    const { clientId } = await createPersonClient(request, { active: true });
    const charges = new ChargesPage(page);
    await charges.open(clientId);
    await charges.add.click();
    await charges.charge.choose(chargeId);
    await charges.amount.fill('75');
    await charges.dueDate.fill('2026-02-15');
    await charges.submit.click();
    await expect(charges.rows).toHaveCount(1);
    await expect(charges.rows.first()).toContainText('E2E Client Fee');
    await expect(charges.rows.first()).toContainText('Outstanding 75.00');
  });

  test('a charge is paid, another waived, and an untouched one deleted', async ({
    page,
    request,
  }) => {
    spec('P1-CLIENTS-002/8');
    const chargeId = await ensureClientCharge(request);
    const { clientId } = await createPersonClient(request, { active: true });
    const paid = await addClientCharge(request, clientId, chargeId, { amount: 40 });
    const waived = await addClientCharge(request, clientId, chargeId, { dueDate: '2026-03-01' });
    const untouched = await addClientCharge(request, clientId, chargeId, { dueDate: '2026-04-01' });
    const charges = new ChargesPage(page);
    await charges.open(clientId);
    await expect(charges.rows).toHaveCount(3);

    await charges.pay(paid).click();
    await charges.payDate.fill('2026-02-20');
    await charges.paySubmit.click();
    await expect(charges.status(paid)).toHaveText('Paid');
    await expect(charges.row(paid)).toContainText('Outstanding 0.00');

    await charges.waive(waived).click();
    await charges.confirmWaive.click();
    await expect(charges.status(waived)).toHaveText('Waived');

    await charges.remove(untouched).click();
    await charges.confirmRemove.click();
    await expect(charges.rows).toHaveCount(2);
    await expect(charges.row(untouched)).toHaveCount(0);
  });
});
