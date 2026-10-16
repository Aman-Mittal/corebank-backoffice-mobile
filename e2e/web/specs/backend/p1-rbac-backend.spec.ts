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

import { TID } from '../../../shared/testids';
import { apiBaseUrl } from '../../../shared/fineract-api';
import { createRestrictedUser, permissionsOf } from '../../../shared/factories/users';
import { expect, spec, test } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';
import { AccessDeniedPage } from '../../pages/shell.page';

test.describe('a genuinely restricted user (backend)', () => {
  test('is admitted to clients, refused users by the app, and by the backend', async ({
    page,
    request,
  }) => {
    spec('P1-SHELL-032/2');
    const user = await createRestrictedUser(request, ['READ_CLIENT']);
    const login = new LoginPage(page);
    await login.open();
    await login.signIn(user.username, user.password);
    await page.waitForURL(/\/home$/);
    await page.goto('/clients');
    await expect(new AccessDeniedPage(page).screen).toHaveCount(0);
    await page.goto('/security/users');
    await expect(new AccessDeniedPage(page).screen).toBeVisible();

    const basic = Buffer.from(`${user.username}:${user.password}`).toString('base64');
    const res = await request.get(`${apiBaseUrl()}/v1/users`, {
      headers: { 'Fineract-Platform-TenantId': 'default', Authorization: `Basic ${basic}` },
      ignoreHTTPSErrors: true,
    });
    expect(res.status()).toBe(403);
  });

  test('holds exactly its role, and the superuser is unaffected', async ({ page, request }) => {
    spec('P1-SHELL-028/1');
    const user = await createRestrictedUser(request, ['READ_CLIENT']);
    expect(await permissionsOf(request, user.username, user.password)).toEqual(['READ_CLIENT']);
    expect(await permissionsOf(request, 'mifos', 'password')).toContain('ALL_FUNCTIONS');
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
    await expect(page.getByTestId(TID.shell.navGroup('security'))).toBeVisible();
  });
});
