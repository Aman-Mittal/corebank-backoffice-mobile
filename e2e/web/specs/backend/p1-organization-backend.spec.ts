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

import { runId } from '../../../shared/fineract-api';
import { expect, spec, test } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';
import {
  OfficeFormPage,
  OfficePage,
  OfficesPage,
  StaffFormPage,
  StaffListPage,
  StaffMemberPage,
} from '../../pages/organization.page';

test.describe('organization against the backend', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
  });

  test('an office created through the form is listed and opens', async ({ page }) => {
    spec('P1-ORG-001/12');
    const name = `E2E Office ${runId()}`;
    const list = new OfficesPage(page);
    await list.open();
    await list.create.click();
    const form = new OfficeFormPage(page);
    await form.name.fill(name);
    await form.openingDate.fill('2026-01-05');
    await form.submit.click();
    await expect(new OfficePage(page).name).toHaveText(name);
    await list.open();
    await list.search.fill(name);
    await expect(list.rows).toHaveCount(1);
  });

  test('staff created in the head office is listed as active', async ({ page }) => {
    spec('P1-ORG-002/11');
    const lastname = `E2E${runId()}`;
    const list = new StaffListPage(page);
    await list.open();
    await list.create.click();
    const form = new StaffFormPage(page);
    await form.office.choose(1);
    await form.firstname.fill('Ada');
    await form.lastname.fill(lastname);
    await form.joiningDate.fill('2026-01-05');
    await form.submit.click();
    await expect(new StaffMemberPage(page).name).toHaveText(`${lastname}, Ada`);
    await list.open();
    await list.search.fill(lastname);
    await expect(list.rows).toHaveCount(1);
    await expect(list.rows.first()).toContainText('Active');
  });
});
