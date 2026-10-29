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
import { ProfilePage } from '../../pages/profile.page';

test.describe('profile (backend)', () => {
  test("shows the signed-in user's record from the server", async ({ page }) => {
    spec('P1-SHELL-038/6');
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
    const profile = new ProfilePage(page);
    await profile.open();
    await expect(profile.username).toHaveText('mifos');
    await expect(profile.office).toContainText('Head Office');
    await expect(profile.roles).toContainText('Super user');
  });
});
