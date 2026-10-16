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

import { expect, spec, test } from '../../fixtures';
import { mockApi, signInHandler } from '../../mocks/api';
import { HomePage } from '../../pages/home.page';
import { LoginPage } from '../../pages/login.page';

test.describe('session @mobile', () => {
  test('a signed-out deep link to home goes to sign-in', async ({ page }) => {
    spec('P1-SHELL-003/1');
    await page.goto('/home');
    await expect(new LoginPage(page).screen).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('the session survives a reload in the same tab, and sign-out ends it', async ({ page }) => {
    spec('P1-SHELL-003/2');
    await mockApi(page, { 'POST /v1/authentication': signInHandler() });
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    const home = new HomePage(page);
    await expect(home.screen).toBeVisible();

    await page.reload();
    await expect(home.welcome).toContainText('mifos');

    await home.signOut.click();
    await expect(login.screen).toBeVisible();
    await expect(login.notice).toHaveCount(0);
    await page.goto('/home');
    await expect(login.screen).toBeVisible();
  });

  test('credentials are never written to localStorage', async ({ page }) => {
    spec('P1-SHELL-003/3');
    await mockApi(page, { 'POST /v1/authentication': signInHandler() });
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await expect(new HomePage(page).screen).toBeVisible();
    const persisted = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
    expect(persisted).not.toContain('bWlmb3M6cGFzc3dvcmQ=');
  });

  test('a 401 on an authenticated request ends the session with the expired notice', async ({
    page,
  }) => {
    spec('P1-SHELL-022/1');
    await mockApi(page, {
      'POST /v1/authentication': signInHandler(),
      'GET /v1/offices/1': () => ({ status: 401, body: { developerMessage: 'Unauthenticated' } }),
    });
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    // Home reads the user's office; the server has revoked the session in the meantime.
    await expect(login.notice).toContainText(/expired/i);
    await expect(page).toHaveURL(/reason=session-expired/);
  });
});

test.describe('sign-out reason notice', () => {
  test('explains an inactivity sign-out', async ({ page }) => {
    spec('P1-SHELL-022/2');
    const login = new LoginPage(page);
    await login.open('?reason=inactivity');
    await expect(login.notice).toContainText(/inactivity/i);
  });

  test('explains an expired session with different wording', async ({ page }) => {
    spec('P1-SHELL-022/3');
    const login = new LoginPage(page);
    await login.open('?reason=session-expired');
    await expect(login.notice).toContainText(/expired/i);
    await expect(login.notice).not.toContainText(/inactivity/i);
  });

  test('stays silent without a reason, or with one it does not recognise', async ({ page }) => {
    spec('P1-SHELL-022/4');
    const login = new LoginPage(page);
    await login.open();
    await expect(login.notice).toHaveCount(0);
    await login.open('?reason=not-a-real-reason');
    await expect(login.screen).toBeVisible();
    await expect(login.notice).toHaveCount(0);
  });
});
