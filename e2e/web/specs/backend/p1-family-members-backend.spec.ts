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

import { createPersonClient, ensureCodeValue } from '../../../shared/factories/clients';
import { runId } from '../../../shared/fineract-api';
import { expect, spec, test } from '../../fixtures';
import { FamilyPage } from '../../pages/family.page';
import { LoginPage } from '../../pages/login.page';

/** Family members, with the real server deciding what is accepted. */
test.describe('family members against the backend', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
  });

  test('a member is added, edited and deleted', async ({ page, request }) => {
    spec('P1-CLIENTS-019/6');
    const spouse = await ensureCodeValue(request, 'RELATIONSHIP', 'Spouse');
    const { clientId } = await createPersonClient(request, { active: true });
    const first = `Kin${runId()}`;
    const family = new FamilyPage(page);
    await family.open(clientId);
    await family.add.click();
    await family.firstName.fill(first);
    await family.lastName.fill('Before');
    await family.relationship.choose(spouse);
    await family.submit.click();
    await expect(family.rows).toHaveCount(1);
    await expect(family.rows.first()).toContainText(`${first} Before`);

    const testId = await family.rows.first().getAttribute('data-testid');
    const memberId = Number(testId!.split('.').pop());
    await family.edit(memberId).click();
    await family.lastName.fill('After');
    await family.submit.click();
    await expect(family.row(memberId)).toContainText(`${first} After`);
    await family.open(clientId);
    await expect(family.row(memberId)).toContainText(`${first} After`);

    await family.remove(memberId).click();
    await family.confirmRemove.click();
    await expect(family.rows).toHaveCount(0);
  });
});
