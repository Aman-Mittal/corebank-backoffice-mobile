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
import { signInAs } from '../../mocks/personas';
import { ClientsPage } from '../../pages/clients.page';
import { LoginPage } from '../../pages/login.page';
import { Shell } from '../../pages/shell.page';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

test.describe('shell at a phone viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE);
    await signInAs(page, 'superuser');
  });

  test('starts closed and out of the tab order; opens as a modal and takes focus', async ({
    page,
  }) => {
    spec('P1-SHELL-023/1');
    const shell = new Shell(page);
    await expect(shell.drawer).toBeHidden();
    // Tabbing through the page never lands inside the closed navigation.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const inDrawer = await page.evaluate(
        () => !!document.activeElement?.closest('[data-testid="shell.drawer"]'),
      );
      expect(inDrawer).toBe(false);
    }
    await shell.menuButton.click();
    await expect(shell.drawer).toBeVisible();
    await expect(shell.drawer).toHaveAttribute('role', 'dialog');
    await expect(shell.drawer).toHaveAttribute('aria-modal', 'true');
    await expect
      .poll(() =>
        page.evaluate(() => !!document.activeElement?.closest('[data-testid="shell.drawer"]')),
      )
      .toBe(true);
  });

  test('closes on its close button, on Escape, and on the backdrop', async ({ page }) => {
    spec('P1-SHELL-023/2');
    const shell = new Shell(page);
    await shell.menuButton.click();
    await shell.drawerClose.click();
    await expect(shell.drawer).toBeHidden();
    await shell.menuButton.click();
    await page.keyboard.press('Escape');
    await expect(shell.drawer).toBeHidden();
    await shell.menuButton.click();
    await shell.backdrop.click({ position: { x: PHONE.width - 10, y: PHONE.height / 2 } });
    await expect(shell.drawer).toBeHidden();
  });

  test('navigates to a chosen destination and closes', async ({ page }) => {
    spec('P1-SHELL-023/3');
    const shell = new Shell(page);
    await shell.menuButton.click();
    await (await shell.openNavItem(null, 'clients')).click();
    await expect(page).toHaveURL(/\/clients$/);
    await expect(shell.drawer).toBeHidden();
    await expect(new ClientsPage(page).screen).toBeVisible();
  });

  test('does not scroll sideways, and header controls are thumb-sized', async ({ page }) => {
    spec('P1-SHELL-023/4');
    const shell = new Shell(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    for (const control of [shell.menuButton, shell.signOut]) {
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('shell at a desktop viewport', () => {
  test('keeps the sidebar visible and has no menu button', async ({ page }) => {
    spec('P1-SHELL-023/5');
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'superuser');
    const shell = new Shell(page);
    await expect(shell.sidebar).toBeVisible();
    await expect(shell.menuButton).toBeHidden();
    await expect(shell.navItem('clients')).toBeVisible();
  });

  test('signs out from the shell without a notice', async ({ page }) => {
    spec('P1-SHELL-023/6');
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'superuser');
    // From the shell itself, not from a control on one screen.
    await new Shell(page).sidebar.getByTestId(TID.shell.signOut).click();
    const login = new LoginPage(page);
    await expect(login.screen).toBeVisible();
    await expect(login.notice).toHaveCount(0);
  });
});
