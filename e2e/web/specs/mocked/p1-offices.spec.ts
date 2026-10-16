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
import { fieldRejection, organizationHandlers } from '../../mocks/organization';
import { signInAs } from '../../mocks/personas';
import {
  OfficeFormPage,
  OfficePage,
  OfficesPage,
  ScreenState,
} from '../../pages/organization.page';
import { AccessDeniedPage } from '../../pages/shell.page';

test.describe('offices', () => {
  test('lists every office in hierarchy order, indented, with external id and opening date', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-ORG-001/1');
    const api = await signInAs(page, 'officeAdmin', organizationHandlers());
    const list = new OfficesPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(3);
    await expect(list.rows.nth(0)).toContainText('Head Office');
    await expect(list.rows.nth(1)).toContainText('Kampala Branch');
    await expect(list.rows.nth(2)).toContainText('Entebbe Sub-branch');
    await expect(list.row(1)).toContainText('2009-01-01');
    await expect(list.row(2)).toContainText('KB-01');
    const x = async (id: number, name: string) =>
      (await list.row(id).getByText(name, { exact: true }).boundingBox())!.x;
    expect(await x(2, 'Kampala Branch')).toBeGreaterThan(await x(1, 'Head Office'));
    expect(await x(3, 'Entebbe Sub-branch')).toBeGreaterThan(await x(2, 'Kampala Branch'));
    const request = api.calls.find((c) => c.method === 'GET' && c.path === '/v1/offices')!;
    expect(request.query.includeAllOffices).toBe('true');
    await checkA11y();
  });

  test('filters by name, and says so when nothing matches', async ({ page }) => {
    spec('P1-ORG-001/2');
    await signInAs(page, 'officeAdmin', organizationHandlers());
    const list = new OfficesPage(page);
    await list.open();
    await list.search.fill('kamp');
    await expect(list.rows).toHaveCount(1);
    await expect(list.row(2)).toBeVisible();
    await list.search.fill('zzz');
    await expect(list.rows).toHaveCount(0);
    await expect(new ScreenState(page).empty).toBeVisible();
  });

  test('a reader is offered no create control and is refused the create URL', async ({ page }) => {
    spec('P1-ORG-001/3');
    await signInAs(page, 'officeReader', organizationHandlers());
    const list = new OfficesPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(3);
    await expect(list.create).toHaveCount(0);
    await page.goto('/organization/offices/new');
    await expect(new AccessDeniedPage(page).required).toContainText('CREATE_OFFICE');
  });

  test('creates an office under a chosen parent and opens it', async ({ page, checkA11y }) => {
    spec('P1-ORG-001/4');
    const api = await signInAs(page, 'officeAdmin', organizationHandlers());
    const list = new OfficesPage(page);
    await list.open();
    await list.create.click();
    await expect(page).toHaveURL(/\/organization\/offices\/new$/);
    const form = new OfficeFormPage(page);
    await form.name.fill('Jinja Branch');
    await form.parent.choose(2);
    await form.openingDate.fill('2026-01-05');
    await checkA11y();
    await form.submit.click();
    await expect(page).toHaveURL(/\/organization\/offices\/4$/);
    await expect(new OfficePage(page).name).toHaveText('Jinja Branch');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/offices')!;
    expect(post.body).toEqual({
      name: 'Jinja Branch',
      parentId: 2,
      openingDate: '2026-01-05',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  test('keeps Save disabled until the name and a real opening date are given', async ({ page }) => {
    spec('P1-ORG-001/5');
    await signInAs(page, 'officeAdmin', organizationHandlers());
    await page.goto('/organization/offices/new');
    const form = new OfficeFormPage(page);
    await expect(form.screen).toBeVisible();
    await expect(form.submit).toBeDisabled();
    await form.name.fill('Jinja Branch');
    await form.openingDate.fill('2026-02-30');
    await expect(form.submit).toBeDisabled();
    await expect(form.fieldError(TID.officeForm.openingDate)).toContainText('YYYY-MM-DD');
    await form.openingDate.fill('2026-02-28');
    await expect(form.submit).toBeEnabled();
  });

  test('shows a server rejection under the field it names and keeps the input', async ({
    page,
  }) => {
    spec('P1-ORG-001/6');
    await signInAs(page, 'officeAdmin', {
      ...organizationHandlers(),
      'POST /v1/offices': () =>
        fieldRejection('name', 'An office with name `Head Office` already exists'),
    });
    await page.goto('/organization/offices/new');
    const form = new OfficeFormPage(page);
    await form.name.fill('Head Office');
    await form.openingDate.fill('2026-01-05');
    await form.submit.click();
    await expect(form.fieldError(TID.officeForm.name)).toContainText('already exists');
    await expect(form.name).toHaveValue('Head Office');
    await expect(page).toHaveURL(/\/organization\/offices\/new$/);
  });

  test('the view shows the office, links its parent, and offers Edit only to who may edit', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-ORG-001/7');
    await signInAs(page, 'officeAdmin', organizationHandlers());
    const view = new OfficePage(page);
    await view.open(3);
    await expect(view.name).toHaveText('Entebbe Sub-branch');
    await expect(view.openingDate).toContainText('2026-10-03');
    await expect(view.edit).toBeVisible();
    await checkA11y();
    await view.parent.click();
    await expect(page).toHaveURL(/\/organization\/offices\/2$/);
    await expect(view.name).toHaveText('Kampala Branch');
    await expect(view.externalId).toContainText('KB-01');

    await page.evaluate(() => sessionStorage.clear());
    await signInAs(page, 'officeReader', organizationHandlers());
    await view.open(2);
    await expect(view.name).toHaveText('Kampala Branch');
    await expect(view.edit).toHaveCount(0);
  });

  test('edits an office without moving it', async ({ page }) => {
    spec('P1-ORG-001/8');
    const api = await signInAs(page, 'officeAdmin', organizationHandlers());
    const view = new OfficePage(page);
    await view.open(2);
    await view.edit.click();
    await expect(page).toHaveURL(/\/organization\/offices\/2\/edit$/);
    const form = new OfficeFormPage(page);
    await expect(form.name).toHaveValue('Kampala Branch');
    await expect(form.openingDate).toHaveValue('2026-10-02');
    await expect(form.parent.trigger).toContainText('Head Office');
    await expect(form.parent.trigger).toHaveAttribute('aria-disabled', 'true');
    await form.name.fill('Kampala Main Branch');
    await form.submit.click();
    await expect(page).toHaveURL(/\/organization\/offices\/2$/);
    await expect(view.name).toHaveText('Kampala Main Branch');
    const put = api.calls.find((c) => c.method === 'PUT' && c.path === '/v1/offices/2')!;
    expect(put.body).toEqual({
      name: 'Kampala Main Branch',
      externalId: 'KB-01',
      openingDate: '2026-10-02',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  test('a reader is refused the edit URL', async ({ page }) => {
    spec('P1-ORG-001/9');
    await signInAs(page, 'officeReader', organizationHandlers());
    await page.goto('/organization/offices/2/edit');
    await expect(new AccessDeniedPage(page).required).toContainText('UPDATE_OFFICE');
  });

  test('a failed load offers to try again, and trying again recovers', async ({ page }) => {
    spec('P1-ORG-001/10');
    await signInAs(page, 'officeAdmin', organizationHandlers({ failOfficesOnce: true }));
    const list = new OfficesPage(page);
    await list.open();
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await state.retry.click();
    await expect(list.rows).toHaveCount(3);
  });

  test('an unknown office says so and leads back to the list', async ({ page }) => {
    spec('P1-ORG-001/11');
    await signInAs(page, 'officeAdmin', organizationHandlers());
    await new OfficePage(page).open(99);
    const state = new ScreenState(page);
    await expect(state.notFound).toBeVisible();
    await state.back.click();
    await expect(page).toHaveURL(/\/organization\/offices$/);
  });
});
