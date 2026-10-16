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
import { AboutPage } from '../../pages/about.page';
import { LoginPage } from '../../pages/login.page';

/**
 * The disclaimer is a legal statement, so its presence is tested like a feature: it must be
 * reachable before sign-in and must say what DISCLAIMER.md says.
 */
test.describe('about @mobile', () => {
  test('is reachable from sign-in and shows the non-endorsement disclaimer', async ({
    page,
    checkA11y,
  }) => {
    spec('P0-ABOUT-001/1');
    const login = new LoginPage(page);
    await login.open();
    await login.aboutLink.click();

    const about = new AboutPage(page);
    await expect(about.screen).toBeVisible();
    await expect(about.disclaimer).toContainText('not an Apache Software Foundation project');
    await expect(about.disclaimer).toContainText('not part of Apache Fineract');
    await expect(about.disclaimer).toContainText('not endorsed by or affiliated with the ASF');
    await expect(about.license).toContainText('Apache License, Version 2.0');
    await expect(about.version).toContainText(/Version \d+\.\d+\.\d+/);
    await checkA11y();
  });

  test('deep link opens the about screen directly', async ({ page }) => {
    spec('P0-ABOUT-001/2');
    const about = new AboutPage(page);
    await about.open();
    await expect(about.disclaimer).toBeVisible();
  });
});
