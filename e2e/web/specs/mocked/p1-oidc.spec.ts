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
import { authResponse, mockApi } from '../../mocks/api';
import {
  ACCESS_TOKEN,
  mockIdentityProvider,
  OIDC_CONFIG,
  serveDeploymentConfig,
} from '../../mocks/oidc';
import { mockTwoFactor } from '../../mocks/two-factor';
import { LoginPage } from '../../pages/login.page';
import { TwoFactorStep } from '../../pages/two-factor.page';

const userdetails =
  (status = 200) =>
  () =>
    status === 200
      ? {
          status,
          body: authResponse({
            username: 'sso-user',
            permissions: ['READ_CLIENT'],
            base64EncodedAuthenticationKey: undefined,
            accessToken: ACCESS_TOKEN,
          }),
        }
      : { status, body: { developerMessage: 'not found' } };

test.describe('identity-provider sign-in', () => {
  test('is not offered without a deployment config', async ({ page, context }) => {
    spec('P1-SHELL-024/1');
    await serveDeploymentConfig(context, null);
    const login = new LoginPage(page);
    await login.open();
    await expect(login.username).toBeVisible();
    await expect(page.getByTestId(TID.login.oidc)).toHaveCount(0);
  });

  test('is offered above the password form, which still signs in', async ({ page, context }) => {
    spec('P1-SHELL-024/2');
    await serveDeploymentConfig(context, OIDC_CONFIG);
    await mockApi(page, {
      'POST /v1/authentication': () => ({ status: 200, body: authResponse() }),
      'GET /v1/offices/1': () => ({
        status: 200,
        body: { id: 1, name: 'Head Office', hierarchy: '.' },
      }),
    });
    const login = new LoginPage(page);
    await login.open();
    const sso = page.getByTestId(TID.login.oidc);
    await expect(sso).toContainText('Sign in with Bank SSO');
    const [ssoBox, userBox] = [(await sso.boundingBox())!, (await login.username.boundingBox())!];
    expect(ssoBox.y).toBeLessThan(userBox.y);
    await login.signIn();
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
  });

  test('completes with PKCE and a Bearer /userdetails, landing on home with its permissions', async ({
    page,
    context,
  }) => {
    spec('P1-SHELL-024/3');
    await serveDeploymentConfig(context, OIDC_CONFIG);
    const idp = await mockIdentityProvider(context);
    const api = await mockApi(page, {
      'GET /v1/userdetails': userdetails(),
      'GET /v1/offices/1': () => ({
        status: 200,
        body: { id: 1, name: 'Head Office', hierarchy: '.' },
      }),
    });
    const login = new LoginPage(page);
    await login.open();
    await page.getByTestId(TID.login.oidc).click();
    await expect(page.getByTestId(TID.home.welcome)).toContainText('sso-user');
    expect(idp.tokenRequests[0]!.get('code_verifier')).toBeTruthy();
    const details = api.calls.find((c) => c.path === '/v1/userdetails')!;
    expect(details.headers.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
    await expect(page.getByTestId(TID.shell.navItem('clients'))).toBeVisible();
    await expect(page.getByTestId(TID.shell.navGroup('security'))).toHaveCount(0);
  });

  test('explains when the server cannot complete provider sign-in', async ({ page, context }) => {
    spec('P1-SHELL-024/4');
    await serveDeploymentConfig(context, OIDC_CONFIG);
    await mockIdentityProvider(context);
    await mockApi(page, { 'GET /v1/userdetails': userdetails(404) });
    const login = new LoginPage(page);
    await login.open();
    await page.getByTestId(TID.login.oidc).click();
    await expect(login.error).toContainText(/cannot complete identity-provider sign-in/i);
    expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  });

  test('a cancelled provider sign-in leaves the form as it was, without an error', async ({
    page,
    context,
  }) => {
    spec('P1-SHELL-024/5');
    await serveDeploymentConfig(context, OIDC_CONFIG);
    await mockIdentityProvider(context, { cancel: true });
    const api = await mockApi(page, {});
    const login = new LoginPage(page);
    await login.open();
    await page.getByTestId(TID.login.oidc).click();
    await expect(login.screen).toBeVisible();
    await page.waitForTimeout(500);
    await expect(login.error).toHaveCount(0);
    expect(api.calls).toEqual([]);
  });

  test('is not offered during the second-factor step', async ({ page, context }) => {
    spec('P1-SHELL-024/6');
    await serveDeploymentConfig(context, OIDC_CONFIG);
    await mockTwoFactor(page);
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await expect(new TwoFactorStep(page).screen).toBeVisible();
    await expect(page.getByTestId(TID.login.oidc)).toHaveCount(0);
  });
});
