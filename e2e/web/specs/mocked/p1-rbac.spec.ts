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
import { LoginPage } from '../../pages/login.page';
import { AccessDeniedPage, PlaceholderPage, Shell } from '../../pages/shell.page';

/** Gated routes sampled across modules, with the code each needs. */
const GATED = [
  ['/clients', 'READ_CLIENT'],
  ['/security/users', 'READ_USER'],
  ['/accounting/journal-entries', 'READ_JOURNALENTRY'],
  ['/system/scheduler-jobs', 'READ_SCHEDULER'],
] as const;

test.describe('navigation follows permissions', () => {
  test('a clerk sees Clients and not Users, Roles, Journal entries or Chart of accounts', async ({
    page,
  }) => {
    spec('P1-SHELL-027/1');
    await signInAs(page, 'clerk');
    const shell = new Shell(page);
    await expect(shell.navItem('clients')).toBeVisible();
    for (const hidden of [
      'security.users',
      'security.roles',
      'accounting.journal-entries',
      'accounting.chart-of-accounts',
    ]) {
      await expect(page.getByTestId(TID.shell.navItem(hidden))).toHaveCount(0);
    }
    await expect(page.getByTestId(TID.shell.navGroup('security'))).toHaveCount(0);
  });

  test('a clerk is refused admin routes by URL, in place, and admitted to clients', async ({
    page,
  }) => {
    spec('P1-SHELL-027/2');
    await signInAs(page, 'clerk');
    const denied = new AccessDeniedPage(page);
    for (const path of [
      '/security/users',
      '/security/roles/create',
      '/accounting/journal-entries',
    ]) {
      await page.goto(path);
      await expect(denied.screen).toBeVisible();
      await expect(page).toHaveURL((url) => url.pathname === path);
    }
    await page.goto('/clients');
    await expect(denied.screen).toHaveCount(0);
    await expect(new PlaceholderPage(page).screen).toBeVisible();
  });

  test('a module chosen in the navigation opens; a later-phase module says which phase', async ({
    page,
  }) => {
    spec('P1-SHELL-027/3');
    await signInAs(page, 'clerk');
    await new Shell(page).navItem('clients').click();
    const placeholder = new PlaceholderPage(page);
    await expect(placeholder.title).toContainText('Clients');
    await expect(placeholder.phase).toContainText('Phase 1');
  });
});

test.describe('route protection', () => {
  test('a superuser sees every group and reaches the sampled routes', async ({ page }) => {
    spec('P1-SHELL-035/1');
    await signInAs(page, 'superuser');
    for (const group of [
      'transfers',
      'products',
      'accounting',
      'security',
      'organization',
      'system',
    ]) {
      await expect(page.getByTestId(TID.shell.navGroup(group))).toBeVisible();
    }
    for (const [path] of GATED) {
      await page.goto(path);
      await expect(new PlaceholderPage(page).screen).toBeVisible();
    }
  });

  test('a user with no permissions lands on home and is refused every gated route', async ({
    page,
  }) => {
    spec('P1-SHELL-035/2');
    await signInAs(page, 'nobody');
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
    await expect(page.getByTestId(TID.shell.navItem('clients'))).toHaveCount(0);
    const denied = new AccessDeniedPage(page);
    for (const [path, code] of GATED) {
      await page.goto(path);
      await expect(denied.required).toContainText(code);
    }
  });

  test('an unrecognised permission code grants nothing', async ({ page }) => {
    spec('P1-SHELL-035/3');
    await signInAs(page, 'junk');
    await expect(page.getByTestId(TID.shell.navItem('clients'))).toHaveCount(0);
    await page.goto('/clients');
    await expect(new AccessDeniedPage(page).screen).toBeVisible();
  });

  test('a signed-out visitor to a gated route is asked to sign in, not refused', async ({
    page,
  }) => {
    spec('P1-SHELL-035/4');
    await page.goto('/security/users');
    await expect(new LoginPage(page).screen).toBeVisible();
    await expect(new AccessDeniedPage(page).screen).toHaveCount(0);
  });

  test('Access Denied: one heading with focus, polite, names the codes, offers a way home', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-SHELL-035/5');
    await signInAs(page, 'clerk');
    await page.goto('/security/users');
    const denied = new AccessDeniedPage(page);
    await expect(denied.screen.getByRole('heading')).toHaveCount(1);
    await expect(denied.heading).toBeFocused();
    await expect(denied.screen.getByRole('status')).toHaveCount(1);
    await expect(denied.required).toContainText('READ_USER');
    await checkA11y();
    await denied.home.click();
    await expect(page.getByTestId(TID.home.screen)).toBeVisible();
  });

  test('an entry shown in the navigation is admitted by URL; one not shown is refused', async ({
    page,
  }) => {
    spec('P1-SHELL-035/6');
    await signInAs(page, 'clerk');
    const sample = [
      ['clients', '/clients'],
      ['organization.offices', '/organization/offices'],
      ['security.users', '/security/users'],
      ['tasks.work-queues', '/tasks/work-queues'],
    ] as const;
    for (const [id, path] of sample) {
      // The shell renders after the deployment config loads; count only once it is there.
      await expect(page.getByTestId(TID.home.screen)).toBeVisible();
      const shown = (await page.getByTestId(TID.shell.navItem(id)).count()) > 0;
      await page.goto(path);
      await expect(
        shown ? new PlaceholderPage(page).screen : new AccessDeniedPage(page).screen,
      ).toBeVisible();
      await page.goto('/home');
    }
  });

  test('a permissionless user keeps a working home and no dead-end navigation', async ({
    page,
  }) => {
    spec('P1-SHELL-034/1');
    await signInAs(page, 'nobody');
    await expect(page.getByTestId(TID.home.welcome)).toContainText('nobody');
    const ids = await page
      .locator('[data-testid^="nav.item."]:visible')
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).dataset.testid!.replace('nav.item.', '')),
      );
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids.slice(0, 8)) {
      await page.getByTestId(TID.shell.navItem(id)).first().click();
      await expect(page.getByTestId(TID.accessDenied.screen)).toHaveCount(0);
    }
    await new Shell(page).signOut.click();
    await expect(new LoginPage(page).screen).toBeVisible();
  });
});

test.describe('read-only and multi-code access', () => {
  test('ALL_FUNCTIONS_READ reaches the clients list but not client creation', async ({ page }) => {
    spec('P1-SHELL-002/1');
    await signInAs(page, 'reader');
    await page.goto('/clients');
    await expect(new PlaceholderPage(page).screen).toBeVisible();
    await page.goto('/clients/new');
    await expect(new AccessDeniedPage(page).required).toContainText('CREATE_CLIENT');
  });

  test('CREATE_CLIENT or ALL_FUNCTIONS reach both', async ({ page }) => {
    spec('P1-SHELL-002/2');
    for (const persona of ['creator', 'superuser'] as const) {
      await page.context().clearCookies();
      await page.goto('/about');
      await page.evaluate(() => sessionStorage.clear());
      await signInAs(page, persona);
      for (const path of ['/clients', '/clients/new']) {
        await page.goto(path);
        // Admitted means the screen renders, not merely that no refusal is shown.
        await expect(new PlaceholderPage(page).screen).toBeVisible();
        await expect(new AccessDeniedPage(page).screen).toHaveCount(0);
      }
    }
  });

  test('work queues admit READ_LOAN or READ_CLIENT, and refuse neither', async ({ page }) => {
    spec('P1-SHELL-032/1');
    for (const [persona, admitted] of [
      ['loanOfficer', true],
      ['clerk', true],
      ['nobody', false],
    ] as const) {
      await page.goto('/about');
      await page.evaluate(() => sessionStorage.clear());
      await signInAs(page, persona);
      await page.goto('/tasks/work-queues');
      await expect(
        admitted ? new PlaceholderPage(page).screen : new AccessDeniedPage(page).screen,
      ).toBeVisible();
    }
  });

  test('a restricted session keeps its boundary across a reload', async ({ page }) => {
    spec('P1-SHELL-032/3');
    await signInAs(page, 'clerk');
    await page.reload();
    await page.goto('/security/users');
    await expect(new AccessDeniedPage(page).screen).toBeVisible();
    await page.goto('/clients');
    await expect(new PlaceholderPage(page).screen).toBeVisible();
  });
});
