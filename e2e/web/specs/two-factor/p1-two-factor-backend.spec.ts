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
import { clearMailbox, latestOtp } from '../../../shared/mailpit';
import { expect, spec, test } from '../../fixtures';
import { LoginPage } from '../../pages/login.page';
import { TwoFactorStep } from '../../pages/two-factor.page';

/** Runs only against `scripts/e2e-stack-2fa.sh` (the `two-factor` project). */
test.describe('two-factor against the real backend', () => {
  test.beforeEach(() => clearMailbox());

  test('stops for the second factor, calling nothing else', async ({ page }) => {
    spec('P1-SHELL-037/1');
    const calls: string[] = [];
    page.on(
      'request',
      (r) => r.url().includes('/api/v1/') && calls.push(new URL(r.url()).pathname),
    );
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await expect(new TwoFactorStep(page).screen).toBeVisible();
    expect(calls.filter((p) => !/\/v1\/(authentication|twofactor)/.test(p))).toEqual([]);
  });

  test('completes with the emailed code, after which the session works', async ({ page }) => {
    spec('P1-SHELL-037/2');
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    const step = new TwoFactorStep(page);
    const since = Date.now();
    await step.send.click();
    await step.enter(await latestOtp(since));
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
    const clients = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/v1/clients'));
    await page.goto('/clients');
    expect((await clients).status()).toBe(200);
  });

  test('a wrong code is refused with the backend reason', async ({ page }) => {
    spec('P1-SHELL-037/3');
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    const step = new TwoFactorStep(page);
    await step.send.click();
    await step.enter('NOPE1');
    await expect(step.error).toContainText(/token/i);
  });
});
