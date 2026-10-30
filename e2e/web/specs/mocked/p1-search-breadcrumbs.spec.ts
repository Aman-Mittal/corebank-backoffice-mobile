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
import { clientsHandlers } from '../../mocks/clients';
import { organizationHandlers } from '../../mocks/organization';
import { signInAs } from '../../mocks/personas';
import { searchHandlers } from '../../mocks/search';
import { Breadcrumbs, SearchPage } from '../../pages/search.page';

/** Longer than the search's 300 ms debounce, so a request that was going to go has gone. */
const SETTLE_MS = 900;

test.describe('global search', () => {
  test('waits for two characters, then sends one request per phrase', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-SHELL-014/1');
    const search = searchHandlers();
    await signInAs(page, 'superuser', search.handlers);
    const screen = new SearchPage(page);
    await screen.open();
    await screen.query.fill('A');
    await expect(screen.hint).toBeVisible();
    await page.waitForTimeout(SETTLE_MS);
    expect(search.queries).toEqual([]);
    await screen.query.fill('');
    await screen.query.pressSequentially('Ada', { delay: 40 });
    await expect(screen.result('client', 11)).toBeVisible();
    await page.waitForTimeout(SETTLE_MS);
    expect(search.queries).toEqual([{ query: 'Ada', resource: 'clients,loans,savings' }]);
    await checkA11y();
  });

  test('opens the screen behind each kind of record', async ({ page }) => {
    spec('P1-SHELL-014/2');
    await signInAs(page, 'superuser', {
      ...searchHandlers().handlers,
      ...clientsHandlers({ clients: [{ ...CLIENT_11 }] }),
    });
    const screen = new SearchPage(page);
    for (const [type, id, url] of [
      ['client', 11, /\/clients\/11$/],
      ['loan', 22, /\/loans\/22$/],
      ['savings', 33, /\/products\/savings-accounts\/33$/],
    ] as const) {
      await screen.open();
      await screen.query.fill('Ada');
      if (type === 'client') {
        await expect(screen.result(type, id)).toContainText('000000011');
        await expect(screen.result(type, id)).toContainText('Head Office');
      }
      await screen.result(type, id).click();
      await expect(page).toHaveURL(url);
    }
  });

  test('says when nothing matches, and keeps shortcuts when the search fails', async ({ page }) => {
    spec('P1-SHELL-014/3');
    await signInAs(page, 'superuser', searchHandlers().handlers);
    const screen = new SearchPage(page);
    await screen.open();
    await screen.query.fill('Zzq');
    await expect(screen.empty).toBeVisible();

    await page.evaluate(() => sessionStorage.clear());
    await signInAs(page, 'superuser', searchHandlers({ failSearch: true }).handlers);
    await screen.open();
    await screen.query.fill('Offices');
    await expect(screen.shortcut('organization.offices')).toBeVisible();
    await expect(screen.failed).toBeVisible();
  });
});

test.describe('navigation shortcuts', () => {
  test('offers a screen the record search cannot return, and opens it', async ({ page }) => {
    spec('P1-SHELL-013/1');
    await signInAs(page, 'superuser', { ...searchHandlers().handlers, ...organizationHandlers() });
    const screen = new SearchPage(page);
    await screen.open();
    await screen.query.fill('Offices');
    await screen.shortcut('organization.offices').click();
    await expect(page).toHaveURL(/\/organization\/offices$/);
  });

  test('withholds a screen the user may not open', async ({ page }) => {
    spec('P1-SHELL-013/2');
    await signInAs(page, 'clerk', searchHandlers().handlers);
    const screen = new SearchPage(page);
    await screen.open();
    await screen.query.fill('Users');
    await page.waitForTimeout(SETTLE_MS);
    await expect(screen.shortcut('security.users')).toHaveCount(0);
    await screen.query.fill('Clients');
    await expect(screen.shortcut('clients')).toBeVisible();
  });
});

test.describe('breadcrumbs', () => {
  test("show a trail below a module's page, and its crumbs navigate", async ({
    page,
    checkA11y,
  }) => {
    spec('P1-SHELL-005/1');
    await signInAs(page, 'clientAdmin', clientsHandlers());
    const crumbs = new Breadcrumbs(page);
    await page.goto('/clients');
    await expect(page.getByTestId('clients.screen').filter({ visible: true })).toBeVisible();
    await expect(crumbs.trail).toHaveCount(0);
    await page.goto('/clients/new');
    await expect(crumbs.crumb('clients')).toHaveText('Clients');
    await expect(crumbs.current).toHaveText('New client');
    await checkA11y();
    await crumbs.crumb('clients').click();
    await expect(page).toHaveURL(/\/clients$/);
    await expect(crumbs.trail).toHaveCount(0);
  });

  test("name a record's page by its title, in any module", async ({ page }) => {
    spec('P1-SHELL-005/2');
    await signInAs(page, 'clientAdmin', clientsHandlers());
    const crumbs = new Breadcrumbs(page);
    await page.goto('/clients/1');
    await expect(crumbs.current).toHaveText('Ada Lovelace');
    await expect(crumbs.crumb('clients')).toBeVisible();

    await page.evaluate(() => sessionStorage.clear());
    await signInAs(page, 'officeAdmin', organizationHandlers());
    await page.goto('/organization/offices/new');
    await expect(crumbs.crumb('organization.offices')).toHaveText('Offices');
    await expect(crumbs.current).toHaveText('New office');
  });
});

/** Ada as client 11, the id the search answers. */
const CLIENT_11 = {
  id: 11,
  accountNo: '000000011',
  status: { id: 300, code: 'clientStatusType.active', value: 'Active' },
  active: true,
  firstname: 'Ada',
  lastname: 'Lovelace',
  displayName: 'Ada Lovelace',
  officeId: 1,
  officeName: 'Head Office',
  legalForm: { id: 1, code: 'legalFormType.person', value: 'Person' },
};
