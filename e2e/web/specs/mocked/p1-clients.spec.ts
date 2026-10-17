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

import type { Page } from '@playwright/test';

import { TID } from '../../../shared/testids';
import { expect, spec, test } from '../../fixtures';
import { clientsHandlers, manyClients } from '../../mocks/clients';
import { fieldRejection } from '../../mocks/organization';
import { signInAs } from '../../mocks/personas';
import { ClientFormPage, ClientPage, ClientsPage } from '../../pages/clients.page';
import { ScreenState } from '../../pages/organization.page';
import { AccessDeniedPage } from '../../pages/shell.page';

/** Today in the browser's calendar (the pinned time zone), as the form defaults it. */
const browserToday = (page: Page) => page.evaluate(() => new Date().toLocaleDateString('en-CA'));

test.describe('clients list', () => {
  test('lists people and entities with account number, office and status', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-CLIENTS-003/1');
    const api = await signInAs(page, 'clientAdmin', clientsHandlers());
    const list = new ClientsPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(3);
    await expect(list.row(1)).toContainText('Ada Lovelace');
    await expect(list.row(1)).toContainText('000000001');
    await expect(list.row(1)).toContainText('Head Office');
    await expect(list.row(1)).toContainText('Active');
    await expect(list.row(2)).toContainText('Acme Traders Ltd');
    await expect(list.row(2)).toContainText('Kampala Branch');
    await expect(list.row(3)).toContainText('Pending');
    const request = api.calls.find((c) => c.method === 'GET' && c.path === '/v1/clients')!;
    expect(request.query).toMatchObject({ offset: '0', limit: '20' });
    expect(request.query).not.toHaveProperty('legalForm');
    await checkA11y();
  });

  test('searches by name on the server', async ({ page }) => {
    spec('P1-CLIENTS-003/2');
    const api = await signInAs(page, 'clientAdmin', clientsHandlers());
    const list = new ClientsPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(3);
    await list.search.fill('ada');
    await expect(list.rows).toHaveCount(1);
    await expect(list.row(1)).toBeVisible();
    const searched = api.calls.findLast((c) => c.method === 'GET' && c.path === '/v1/clients')!;
    expect(searched.query).toMatchObject({ displayName: 'ada', offset: '0' });
    await list.search.fill('zzz');
    await expect(new ScreenState(page).empty).toBeVisible();
    await expect(list.rows).toHaveCount(0);
  });

  test('pages through the server twenty at a time', async ({ page }) => {
    spec('P1-CLIENTS-003/3');
    const api = await signInAs(page, 'clientAdmin', clientsHandlers({ clients: manyClients(25) }));
    const list = new ClientsPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(20);
    await expect(list.range).toHaveText('1–20 of 25');
    await expect(list.previous).toBeDisabled();
    await list.next.click();
    await expect(list.rows).toHaveCount(5);
    await expect(list.range).toHaveText('21–25 of 25');
    await expect(list.next).toBeDisabled();
    const second = api.calls.findLast((c) => c.method === 'GET' && c.path === '/v1/clients')!;
    expect(second.query).toMatchObject({ offset: '20', limit: '20' });
    await list.previous.click();
    await expect(list.rows).toHaveCount(20);
    await expect(list.range).toHaveText('1–20 of 25');
  });

  test('a reader is offered no create control, and a row opens the client', async ({ page }) => {
    spec('P1-CLIENTS-003/4');
    await signInAs(page, 'clerk', clientsHandlers());
    const list = new ClientsPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(3);
    await expect(list.create).toHaveCount(0);
    await list.row(2).click();
    await expect(page).toHaveURL(/\/clients\/2$/);
    await expect(new ClientPage(page).name).toHaveText('Acme Traders Ltd');
  });

  test('the client page shows the client', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-003/5');
    await signInAs(page, 'clientAdmin', clientsHandlers());
    const view = new ClientPage(page);
    await view.open(1);
    await expect(view.name).toHaveText('Ada Lovelace');
    await expect(view.accountNo).toContainText('000000001');
    await expect(view.status).toContainText('Active');
    await expect(view.office).toContainText('Head Office');
    await expect(view.legalForm).toContainText('Person');
    await expect(view.externalId).toContainText('EXT-ADA');
    await expect(view.mobile).toContainText('0772000001');
    await expect(view.email).toContainText('ada@example.org');
    await expect(view.submittedOn).toContainText('2024-02-20');
    await expect(view.activationDate).toContainText('2024-03-01');
    await checkA11y();
    await view.open(2);
    await expect(view.legalForm).toContainText('Entity');
  });
});

test.describe('client load errors', () => {
  test('a client that does not exist says so and leads back to the list', async ({ page }) => {
    spec('P1-CLIENTS-006/1');
    await signInAs(page, 'clientAdmin', clientsHandlers());
    await new ClientPage(page).open(99);
    const state = new ScreenState(page);
    await expect(state.notFound).toBeVisible();
    await state.back.click();
    await expect(page).toHaveURL(/\/clients$/);
  });

  test('a client that fails to load offers to try again', async ({ page }) => {
    spec('P1-CLIENTS-006/2');
    await signInAs(page, 'clientAdmin', clientsHandlers({ failOneOnce: true }));
    const view = new ClientPage(page);
    await view.open(1);
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await state.retry.click();
    await expect(view.name).toHaveText('Ada Lovelace');
  });

  test('a list that fails to load offers to try again', async ({ page }) => {
    spec('P1-CLIENTS-006/3');
    await signInAs(page, 'clientAdmin', clientsHandlers({ failListOnce: true }));
    const list = new ClientsPage(page);
    await list.open();
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await state.retry.click();
    await expect(list.rows).toHaveCount(3);
  });
});

test.describe('client create', () => {
  test('creates a person from the required fields and opens them', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-009/1');
    const api = await signInAs(page, 'clientAdmin', clientsHandlers());
    const list = new ClientsPage(page);
    await list.open();
    await list.create.click();
    await expect(page).toHaveURL(/\/clients\/new$/);
    const form = new ClientFormPage(page);
    await expect(form.legalForm.trigger).toContainText('Person');
    await form.office.choose(1);
    await form.firstname.fill('Mary');
    await form.lastname.fill('Somerville');
    await expect(form.active).toHaveAttribute('aria-checked', 'true');
    await checkA11y();
    await form.submit.click();
    await expect(page).toHaveURL(/\/clients\/13$/);
    const view = new ClientPage(page);
    await expect(view.name).toHaveText('Mary Somerville');
    await expect(view.status).toContainText('Active');
    const today = await browserToday(page);
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/clients')!;
    expect(post.body).toEqual({
      legalFormId: 1,
      officeId: 1,
      firstname: 'Mary',
      lastname: 'Somerville',
      submittedOnDate: today,
      active: true,
      activationDate: today,
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  test('an entity has one name, and sends only that', async ({ page }) => {
    spec('P1-CLIENTS-009/2');
    const api = await signInAs(page, 'clientAdmin', clientsHandlers());
    const form = new ClientFormPage(page);
    await form.open();
    await form.firstname.fill('Should');
    await form.legalForm.choose(2);
    await expect(form.firstname).toHaveCount(0);
    await expect(form.lastname).toHaveCount(0);
    await form.office.choose(2);
    await form.fullname.fill('Nile Cooperative');
    await form.submit.click();
    const view = new ClientPage(page);
    await expect(view.name).toHaveText('Nile Cooperative');
    await expect(view.legalForm).toContainText('Entity');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/clients')!;
    expect(post.body).toMatchObject({ legalFormId: 2, officeId: 2, fullname: 'Nile Cooperative' });
    expect(post.body).not.toHaveProperty('firstname');
    expect(post.body).not.toHaveProperty('lastname');
  });

  test('an inactive client is sent without an activation date and opens as pending', async ({
    page,
  }) => {
    spec('P1-CLIENTS-009/3');
    const api = await signInAs(page, 'clientAdmin', clientsHandlers());
    const form = new ClientFormPage(page);
    await form.open();
    await form.office.choose(1);
    await form.firstname.fill('Mary');
    await form.lastname.fill('Somerville');
    await expect(form.activationDate).toBeVisible();
    await form.active.click();
    await expect(form.activationDate).toHaveCount(0);
    await form.submit.click();
    await expect(new ClientPage(page).status).toContainText('Pending');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/clients')!;
    expect(post.body).toMatchObject({ active: false });
    expect(post.body).not.toHaveProperty('activationDate');
  });

  test('shows a server rejection under the external id field', async ({ page }) => {
    spec('P1-CLIENTS-009/4');
    await signInAs(page, 'clientAdmin', {
      ...clientsHandlers(),
      'POST /v1/clients': () =>
        fieldRejection('externalId', 'Client with externalId `EXT-ADA` already exists'),
    });
    const form = new ClientFormPage(page);
    await form.open();
    await form.office.choose(1);
    await form.firstname.fill('Ada');
    await form.lastname.fill('Again');
    await form.externalId.fill('EXT-ADA');
    await form.submit.click();
    await expect(form.fieldError(TID.clientForm.externalId)).toContainText('already exists');
    await expect(form.firstname).toHaveValue('Ada');
  });

  test('a reader is refused the create URL', async ({ page }) => {
    spec('P1-CLIENTS-009/5');
    await signInAs(page, 'clerk', clientsHandlers());
    await page.goto('/clients/new');
    await expect(new AccessDeniedPage(page).required).toContainText('CREATE_CLIENT');
  });
});

test.describe('client create validation', () => {
  test('keeps Save disabled until the office and the names are given', async ({ page }) => {
    spec('P1-CLIENTS-010/1');
    await signInAs(page, 'clientAdmin', clientsHandlers());
    const form = new ClientFormPage(page);
    await form.open();
    await expect(form.screen).toBeVisible();
    await expect(form.submit).toBeDisabled();
    await form.firstname.fill('Mary');
    await form.lastname.fill('Somerville');
    await expect(form.submit).toBeDisabled();
    await form.office.choose(1);
    await expect(form.submit).toBeEnabled();
    await form.lastname.fill('');
    await expect(form.fieldError(TID.clientForm.lastname)).toBeVisible();
    await expect(form.submit).toBeDisabled();
    await form.legalForm.choose(2);
    await expect(form.submit).toBeDisabled();
    await form.fullname.fill('Nile Cooperative');
    await expect(form.submit).toBeEnabled();
  });

  test('says why the mobile number, email or a date is wrong', async ({ page }) => {
    spec('P1-CLIENTS-010/2');
    await signInAs(page, 'clientAdmin', clientsHandlers());
    const form = new ClientFormPage(page);
    await form.open();
    await form.office.choose(1);
    await form.firstname.fill('Mary');
    await form.lastname.fill('Somerville');
    await expect(form.submit).toBeEnabled();
    await form.mobile.fill('07x2');
    await expect(form.fieldError(TID.clientForm.mobile)).toContainText(/digits/i);
    await expect(form.submit).toBeDisabled();
    await form.mobile.fill('0772000000');
    await form.email.fill('mary@');
    await expect(form.fieldError(TID.clientForm.email)).toContainText(/email/i);
    await expect(form.submit).toBeDisabled();
    await form.email.fill('mary@example.org');
    await form.submittedOn.fill('2026-02-30');
    await expect(form.fieldError(TID.clientForm.submittedOn)).toContainText('YYYY-MM-DD');
    await expect(form.submit).toBeDisabled();
    await form.submittedOn.fill('2026-02-03');
    await form.activationDate.fill('2026-13-01');
    await expect(form.fieldError(TID.clientForm.activationDate)).toContainText('YYYY-MM-DD');
    await expect(form.submit).toBeDisabled();
    await form.activationDate.fill('2026-02-03');
    await expect(form.submit).toBeEnabled();
  });
});

test.describe('client activation', () => {
  test('activates a pending client on the default date', async ({ page }) => {
    spec('P1-CLIENTS-011/1');
    const api = await signInAs(page, 'clientAdmin', clientsHandlers());
    const view = new ClientPage(page);
    await view.open(3);
    await expect(view.status).toContainText('Pending');
    await view.activate.click();
    const today = await browserToday(page);
    await expect(view.actionDate).toHaveValue(today);
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Active');
    await expect(view.activate).toHaveCount(0);
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/clients/3')!;
    expect(post.query).toEqual({ command: 'activate' });
    expect(post.body).toEqual({ activationDate: today, dateFormat: 'yyyy-MM-dd', locale: 'en' });
  });

  test('is not offered for an active client, nor without the permission', async ({ page }) => {
    spec('P1-CLIENTS-011/2');
    await signInAs(page, 'clientAdmin', clientsHandlers());
    const view = new ClientPage(page);
    await view.open(1);
    await expect(view.name).toHaveText('Ada Lovelace');
    await expect(view.activate).toHaveCount(0);

    await page.evaluate(() => sessionStorage.clear());
    await signInAs(page, 'clerk', clientsHandlers());
    await view.open(3);
    await expect(view.status).toContainText('Pending');
    await expect(view.activate).toHaveCount(0);
  });
});
