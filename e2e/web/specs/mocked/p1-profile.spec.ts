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
import { expect, spec, test } from '../../fixtures';
import { authResponse, MOCK_API, mockApi } from '../../mocks/api';
import { signInAs } from '../../mocks/personas';
import { POLICY, profileHandlers } from '../../mocks/profile';
import { LoginPage } from '../../pages/login.page';
import { ScreenState } from '../../pages/organization.page';
import { ProfilePage } from '../../pages/profile.page';
import { Shell } from '../../pages/shell.page';

test.describe('profile', () => {
  test('Profile in the navigation shows the signed-in user, read from GET /users/<id>', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-SHELL-038/1');
    const api = await signInAs(page, 'superuser', profileHandlers());
    await new Shell(page).navItem('profile').click();
    await expect(page).toHaveURL(/\/profile$/);
    const profile = new ProfilePage(page);
    await expect(profile.username).toHaveText('mifos');
    await expect(profile.displayName).toHaveText('App Administrator');
    await expect(profile.office).toHaveText('Head Office (1)');
    await expect(profile.email).toHaveText('mifos@example.org');
    await expect(profile.roles).toContainText('Super user');
    expect(api.calls.some((c) => c.method === 'GET' && c.path === '/v1/users/1')).toBe(true);
    await checkA11y();
  });

  test('a failed read shows the error state, and trying again shows the profile', async ({
    page,
  }) => {
    spec('P1-SHELL-038/2');
    await signInAs(page, 'superuser', profileHandlers({ failProfileOnce: true }));
    const profile = new ProfilePage(page);
    await profile.open();
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await expect(profile.username).toHaveCount(0);
    await state.retry.click();
    await expect(profile.username).toHaveText('mifos');
  });

  test('changes the password once both fields match, and says so', async ({ page, checkA11y }) => {
    spec('P1-SHELL-038/3');
    const api = await signInAs(page, 'superuser', profileHandlers());
    const profile = new ProfilePage(page);
    await profile.open();
    await expect(profile.changePassword).toHaveAttribute('aria-expanded', 'false');
    await profile.changePassword.click();
    await expect(profile.changePassword).toHaveAttribute('aria-expanded', 'true');
    await expect(profile.policy).toContainText(POLICY);
    await expect(profile.submit).toBeDisabled();
    await profile.newPassword.fill('secret-1');
    await expect(profile.submit).toBeDisabled();
    await profile.repeatPassword.fill('secret-2');
    await expect(profile.mismatch).toBeVisible();
    await expect(profile.submit).toBeDisabled();
    await checkA11y();
    await profile.repeatPassword.fill('secret-1');
    await expect(profile.mismatch).toHaveCount(0);
    await profile.submit.click();
    await expect(profile.notice).toBeVisible();
    await expect(profile.newPassword).toHaveCount(0);
    await expect(profile.changePassword).toHaveAttribute('aria-expanded', 'false');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/users/1/pwd');
    expect(post?.body).toEqual({ password: 'secret-1', repeatPassword: 'secret-1' });
  });

  test('a refused password is explained in the open form; Cancel closes and clears it', async ({
    page,
  }) => {
    spec('P1-SHELL-038/4');
    await signInAs(page, 'superuser', profileHandlers({ noPolicy: true }));
    const profile = new ProfilePage(page);
    await profile.open();
    await profile.changePassword.click();
    await expect(profile.newPassword).toBeVisible();
    await expect(profile.policy).toHaveCount(0);
    await profile.newPassword.fill('abc');
    await profile.repeatPassword.fill('abc');
    await profile.submit.click();
    await expect(profile.error).toContainText(POLICY);
    await expect(profile.newPassword).toHaveValue('abc');
    await expect(profile.notice).toHaveCount(0);
    await profile.cancel.click();
    await expect(profile.newPassword).toHaveCount(0);
    await profile.changePassword.click();
    await expect(profile.newPassword).toHaveValue('');
    await expect(profile.error).toHaveCount(0);
  });

  test("the next user to sign in never sees the last one's profile", async ({ page }) => {
    spec('P1-SHELL-038/5');
    await signInAs(page, 'superuser', profileHandlers());
    const shell = new Shell(page);
    const profile = new ProfilePage(page);
    // In-app navigation throughout: a reload would rebuild the state and prove nothing.
    await shell.navItem('profile').click();
    await expect(profile.username).toHaveText('mifos');
    await shell.signOut.click();
    await page.waitForURL(/\/login/);

    const second = await mockApi(page, {
      'POST /v1/authentication': () => ({
        status: 200,
        body: authResponse({
          username: 'clerk',
          userId: 7,
          officeId: 2,
          officeName: 'Kampala Branch',
          permissions: ['READ_CLIENT'],
        }),
      }),
      'GET /v1/offices/2': () => ({
        status: 200,
        body: { id: 2, name: 'Kampala Branch', openingDate: [2026, 10, 2], hierarchy: '.2.' },
      }),
      ...profileHandlers(),
    });
    // Holds clerk's record until the screen has been checked for mifos's.
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(`${MOCK_API}/v1/users/7`, async (route) => {
      await held;
      await route.fallback();
    });
    await new LoginPage(page).signIn('mifos', 'password');
    await page.waitForURL(/\/home$/);
    await shell.navItem('profile').click();
    await expect(page.getByTestId(TID.state.loading)).toBeVisible();
    await expect(profile.username).toHaveCount(0);
    release();
    await expect(profile.username).toHaveText('clerk');
    await expect(profile.displayName).toHaveText('Clara Clerk');
    await expect(profile.office).toHaveText('Kampala Branch (2)');
    expect(second.calls.some((c) => c.path === '/v1/users/1')).toBe(false);
  });
});
