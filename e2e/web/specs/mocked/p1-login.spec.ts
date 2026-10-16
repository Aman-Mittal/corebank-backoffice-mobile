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
import { MOCK_API, mockApi, signInHandler } from '../../mocks/api';
import { HomePage } from '../../pages/home.page';
import { LoginPage } from '../../pages/login.page';

test.describe('sign-in @mobile', () => {
  test('shows server, tenant, username and password, with submit disabled until complete', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-SHELL-019/1');
    const login = new LoginPage(page);
    await login.open();
    await expect(login.server).toHaveValue(MOCK_API);
    await expect(login.tenant).toHaveValue('default');
    await expect(login.submit).toBeDisabled();
    await login.username.fill('mifos');
    await expect(login.submit).toBeDisabled();
    await login.password.fill('password');
    await expect(login.submit).toBeEnabled();
    await login.tenant.fill('');
    await expect(login.submit).toBeDisabled();
    await checkA11y();
  });

  test('signs in with valid credentials, sending the typed tenant, and lands on home', async ({
    page,
  }) => {
    spec('P1-SHELL-020/1');
    const api = await mockApi(page, { 'POST /v1/authentication': signInHandler() });
    const login = new LoginPage(page);
    await login.open();
    await login.tenant.fill('acme');
    await login.signIn();

    const home = new HomePage(page);
    await expect(home.screen).toBeVisible();
    await expect(home.welcome).toContainText('mifos');
    await expect(home.office).toContainText('Head Office');
    await expect(page).toHaveURL(/\/home$/);
    const call = api.calls.find((c) => c.path === '/v1/authentication')!;
    expect(call.headers['fineract-platform-tenantid']).toBe('acme');
    expect(call.headers.authorization).toBeUndefined();
    expect(call.body).toEqual({ username: 'mifos', password: 'password' });
  });

  test('keeps the user on sign-in with an error for wrong credentials, and clears it on edit', async ({
    page,
  }) => {
    spec('P1-SHELL-020/2');
    await mockApi(page, { 'POST /v1/authentication': signInHandler() });
    const login = new LoginPage(page);
    await login.open();
    await login.signIn('mifos', 'wrong');
    await expect(login.error).toContainText(/username or password/i);
    await expect(login.screen).toBeVisible();
    await expect(login.password).toHaveValue('');
    await login.password.fill('x');
    await expect(login.error).toHaveCount(0);
  });

  test('explains an unreachable server instead of a credential error', async ({ page }) => {
    spec('P1-SHELL-020/3');
    await page.route(`${MOCK_API}/**`, (route) => route.abort('connectionrefused'));
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await expect(login.error).toContainText(/cannot reach the server/i);
  });

  test('rejects a server address that is not http(s)', async ({ page }) => {
    spec('P1-SHELL-019/2');
    const login = new LoginPage(page);
    await login.open();
    await login.server.fill('ftp://bank.test/api');
    await login.username.fill('mifos');
    await login.password.fill('password');
    await expect(login.submit).toBeDisabled();
    await expect(page.getByText(/valid server address/i)).toBeVisible();
  });

  test('submits with Enter from the password field', async ({ page }) => {
    spec('P1-SHELL-020/4');
    await mockApi(page, { 'POST /v1/authentication': signInHandler() });
    const login = new LoginPage(page);
    await login.open();
    await login.username.fill('mifos');
    await login.password.fill('password');
    await login.password.press('Enter');
    await expect(new HomePage(page).screen).toBeVisible();
  });
});

test.describe('sign-in layout @mobile', () => {
  for (const [id, size] of [
    ['P1-SHELL-021/1', { width: 375, height: 667 }],
    ['P1-SHELL-021/2', { width: 768, height: 1024 }],
    ['P1-SHELL-021/3', { width: 1280, height: 720 }],
  ] as const) {
    test(`fits ${size.width}x${size.height} without horizontal overflow`, async ({ page }) => {
      spec(id);
      await page.setViewportSize(size);
      const login = new LoginPage(page);
      await login.open();
      await expect(login.submit).toBeInViewport();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
