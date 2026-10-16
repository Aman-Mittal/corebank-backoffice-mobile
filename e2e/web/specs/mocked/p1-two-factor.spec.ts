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
import { EMAIL, mockTwoFactor, SMS, TFA_TOKEN, VALID_CODE } from '../../mocks/two-factor';
import { LoginPage } from '../../pages/login.page';
import { TwoFactorStep } from '../../pages/two-factor.page';

async function passwordStep(page: import('@playwright/test').Page) {
  const login = new LoginPage(page);
  await login.open();
  await login.signIn();
  return new TwoFactorStep(page);
}

test.describe('two-factor sign-in @mobile', () => {
  test('asks for a second factor after the password, naming the single channel', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-SHELL-036/1');
    await mockTwoFactor(page);
    const step = await passwordStep(page);
    await expect(step.screen).toBeVisible();
    await expect(step.target).toContainText(EMAIL.target);
    await expect(step.send).toBeVisible();
    await expect(page.getByTestId(TID.home.screen)).toHaveCount(0);
    await checkA11y();
  });

  test('completes with the right code and then sends the TFA token on every request', async ({
    page,
  }) => {
    spec('P1-SHELL-036/2');
    const api = await mockTwoFactor(page);
    const step = await passwordStep(page);
    await step.send.click();
    await step.enter(VALID_CODE);
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
    await expect
      .poll(() => api.calls.filter((c) => c.path === '/v1/offices/1').length)
      .toBeGreaterThan(0);
    const after = api.calls.find((c) => c.path === '/v1/offices/1')!;
    expect(after.headers['fineract-platform-tfa-token']).toBe(TFA_TOKEN);
    expect(after.headers.authorization).toMatch(/^Basic /);
  });

  test('keeps the user on the step for a wrong code, clears it, and gives the reason', async ({
    page,
  }) => {
    spec('P1-SHELL-036/3');
    await mockTwoFactor(page);
    const step = await passwordStep(page);
    await step.send.click();
    await step.enter('WRONG');
    await expect(step.error).toContainText('one time token is invalid');
    await expect(step.code).toHaveValue('');
    await expect(step.screen).toBeVisible();
  });

  test('accepts the right code after a wrong one', async ({ page }) => {
    spec('P1-SHELL-036/4');
    await mockTwoFactor(page);
    const step = await passwordStep(page);
    await step.send.click();
    await step.enter('WRONG');
    await expect(step.error).toBeVisible();
    await step.enter(VALID_CODE);
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
  });

  test('offers a choice between channels and sends the chosen one', async ({ page }) => {
    spec('P1-SHELL-036/5');
    const api = await mockTwoFactor(page, { methods: [EMAIL, SMS] });
    const step = await passwordStep(page);
    await step.method('sms').click();
    await step.send.click();
    await expect(step.code).toBeVisible();
    const send = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/twofactor')!;
    expect(send).toBeTruthy();
    await expect
      .poll(() => api.calls.filter((c) => c.method === 'POST' && c.path === '/v1/twofactor').length)
      .toBe(1);
  });

  test('says so when no channel is configured, offering only the way back', async ({ page }) => {
    spec('P1-SHELL-036/6');
    await mockTwoFactor(page, { methods: [] });
    const step = await passwordStep(page);
    await expect(step.noMethods).toBeVisible();
    await expect(step.send).toHaveCount(0);
    await expect(step.back).toBeVisible();
  });

  test('returns to the choice with an error when the code cannot be sent', async ({ page }) => {
    spec('P1-SHELL-036/7');
    await mockTwoFactor(page, { canSend: false });
    const step = await passwordStep(page);
    await step.send.click();
    await expect(step.error).toBeVisible();
    await expect(step.send).toBeVisible();
    await expect(step.code).toHaveCount(0);
  });

  test('a half-finished session cannot reach the app by URL', async ({ page }) => {
    spec('P1-SHELL-036/8');
    const api = await mockTwoFactor(page);
    const step = await passwordStep(page);
    await expect(step.screen).toBeVisible();
    for (const path of ['/home', '/clients']) {
      await page.goto(path);
      await expect(step.screen).toBeVisible();
    }
    const outside = api.calls.filter(
      (c) => c.path !== '/v1/authentication' && !c.path.startsWith('/v1/twofactor'),
    );
    expect(outside).toEqual([]);
  });

  test('backing out returns to an empty password form and stores nothing', async ({ page }) => {
    spec('P1-SHELL-036/9');
    await mockTwoFactor(page);
    const step = await passwordStep(page);
    await step.back.click();
    const login = new LoginPage(page);
    await expect(login.username).toHaveValue('');
    await expect(login.password).toHaveValue('');
    await expect(login.tenant).toHaveValue('default');
    expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  });

  test('an account without a second factor signs in as before', async ({ page }) => {
    spec('P1-SHELL-036/10');
    const api = await mockTwoFactor(page, { required: false });
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
    expect(api.calls.filter((c) => c.path.startsWith('/v1/twofactor'))).toEqual([]);
  });

  test('sign-out invalidates the token at the server first', async ({ page }) => {
    spec('P1-SHELL-036/11');
    const api = await mockTwoFactor(page);
    const step = await passwordStep(page);
    await step.send.click();
    await step.enter(VALID_CODE);
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
    await page.getByTestId(TID.shell.signOut).filter({ visible: true }).click();
    await expect(new LoginPage(page).screen).toBeVisible();
    const invalidate = api.calls.find((c) => c.path === '/v1/twofactor/invalidate')!;
    expect(invalidate.body).toEqual({ token: TFA_TOKEN });
  });

  test('a completed 2FA session survives a reload and keeps sending the token', async ({
    page,
  }) => {
    spec('P1-SHELL-036/12');
    const api = await mockTwoFactor(page);
    const step = await passwordStep(page);
    await step.send.click();
    await step.enter(VALID_CODE);
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
    const before = api.calls.length;
    await page.reload();
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
    await expect
      .poll(() => api.calls.slice(before).find((c) => c.path === '/v1/offices/1'))
      .toBeTruthy();
    expect(
      api.calls.slice(before).find((c) => c.path === '/v1/offices/1')!.headers[
        'fineract-platform-tfa-token'
      ],
    ).toBe(TFA_TOKEN);
  });
});
