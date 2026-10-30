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
import { createBranch } from '../../../shared/factories/offices';
import { createRestrictedUser } from '../../../shared/factories/users';
import { fineractPost } from '../../../shared/fineract-api';
import { TID } from '../../../shared/testids';
import { expect, spec, test } from '../../fixtures';
import { ClientsPage } from '../../pages/clients.page';
import { LoginPage } from '../../pages/login.page';
import { ScreenState } from '../../pages/organization.page';

const byId = (page: import('@playwright/test').Page, id: string) =>
  page.getByTestId(id).filter({ visible: true });

async function signInAs(page: import('@playwright/test').Page, username: string, password: string) {
  const login = new LoginPage(page);
  await login.open();
  await login.signIn(username, password);
  await page.waitForURL(/\/home$/);
}

test.describe('server refusals against the backend', () => {
  test('with the gates off, a refused list says so and a covered list loads', async ({
    page,
    request,
  }) => {
    spec('P1-SHELL-030/4');
    const user = await createRestrictedUser(request, ['READ_CLIENT']);
    await page.route('**/config.json*', (route) => route.fulfill({ json: { rbacEnabled: false } }));
    await signInAs(page, user.username, user.password);
    const state = new ScreenState(page);
    await page.goto('/organization/offices');
    await expect(state.error).toContainText('Your role does not cover this.');
    await expect(state.retry).toHaveCount(0);
    await page.goto('/clients');
    await expect(byId(page, TID.clients.screen)).toBeVisible();
    await expect(state.error).toHaveCount(0);
  });
});

test.describe('a user scoped to a branch office', () => {
  const PERMISSIONS = ['READ_CLIENT', 'READ_OFFICE'];

  async function seedBranch(request: import('@playwright/test').APIRequestContext) {
    const branch = await createBranch(request);
    const headOffice = await createPersonClient(request, { active: true });
    const res = await fineractPost(request, '/v1/clients', {
      officeId: branch.officeId,
      legalFormId: 1,
      firstname: 'Branch',
      lastname: `E2E${branch.officeId}x${Date.now().toString(36)}`,
      submittedOnDate: '2026-01-05',
      active: true,
      activationDate: '2026-01-05',
      locale: 'en',
      dateFormat: 'yyyy-MM-dd',
    });
    if (!res.ok()) throw new Error(`POST /clients answered ${res.status()}`);
    const branchClient = (await res.json()).clientId as number;
    const user = await createRestrictedUser(request, PERMISSIONS, branch.officeId);
    return { branch, headOffice, branchClient, user };
  }

  test("is told its office and listed only its office's clients", async ({ page, request }) => {
    spec('P1-SHELL-033/1');
    const { branch, headOffice, branchClient, user } = await seedBranch(request);
    await signInAs(page, user.username, user.password);
    await expect(byId(page, TID.home.office)).toContainText(branch.name);
    const list = new ClientsPage(page);
    await list.open();
    await list.search.fill('E2E');
    await expect(list.row(branchClient)).toBeVisible();
    await expect(list.row(headOffice.clientId)).toHaveCount(0);
  });

  test("is told another office's client cannot be shown, and opens its own", async ({
    page,
    request,
  }) => {
    spec('P1-SHELL-033/2');
    const { headOffice, branchClient, user } = await seedBranch(request);
    await signInAs(page, user.username, user.password);
    await page.goto(`/clients/${headOffice.clientId}`);
    await expect(byId(page, TID.state.notFound)).toContainText(
      "This client doesn't exist, or you don't have permission to view it.",
    );
    await expect(byId(page, TID.accessDenied.screen)).toHaveCount(0);
    await page.goto(`/clients/${branchClient}`);
    await expect(byId(page, TID.client.name)).toContainText('Branch');
  });

  test('is shown its office but offered no edit', async ({ page, request }) => {
    spec('P1-SHELL-033/3');
    const { branch, user } = await seedBranch(request);
    await signInAs(page, user.username, user.password);
    await page.goto(`/organization/offices/${branch.officeId}`);
    await expect(byId(page, TID.office.name)).toContainText(branch.name);
    await expect(byId(page, TID.office.edit)).toHaveCount(0);
  });
});
