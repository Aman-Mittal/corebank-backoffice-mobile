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
import { LoginPage } from '../../pages/login.page';

test.describe('app shell @mobile', () => {
  test('boots and renders the sign-in screen', async ({ page, checkA11y }) => {
    spec('P0-HARNESS-001/1');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    const login = new LoginPage(page);
    await login.open();

    await expect(login.screen).toBeVisible();
    await expect(login.username).toBeVisible();
    await expect(login.password).toBeVisible();
    await expect(login.submit).toBeVisible();
    await expect(page).toHaveTitle(/CoreBank Backoffice/);
    expect(errors).toEqual([]);
    await checkA11y();
  });
});
