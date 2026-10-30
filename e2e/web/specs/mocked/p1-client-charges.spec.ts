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
import { chargesHandlers } from '../../mocks/charges';
import { clientsHandlers } from '../../mocks/clients';
import { signInAs, type Persona } from '../../mocks/personas';
import { ChargesPage } from '../../pages/charges.page';
import { ClientPage } from '../../pages/clients.page';
import { ScreenState } from '../../pages/organization.page';
import { AccessDeniedPage } from '../../pages/shell.page';

const ISO = { dateFormat: 'yyyy-MM-dd', locale: 'en' };
const browserToday = (page: Page) => page.evaluate(() => new Date().toLocaleDateString('en-CA'));

const signIn = (page: Page, persona: Persona = 'chargeAdmin', options = {}) =>
  signInAs(page, persona, { ...clientsHandlers(), ...chargesHandlers(options) });

test.describe('adding a client charge', () => {
  test('offers the template charges, then their amount and a due date', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-CLIENTS-001/1');
    await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(2);
    await charges.add.click();
    await expect(charges.amount).toHaveCount(0);
    await expect(charges.dueDate).toHaveCount(0);
    await expect(charges.submit).toBeDisabled();
    await charges.charge.trigger.click();
    await expect(page.getByTestId(TID.option(TID.chargeForm.charge, 1))).toContainText(
      'Membership fee',
    );
    await expect(page.getByTestId(TID.option(TID.chargeForm.charge, 2))).toContainText(
      'Late payment penalty',
    );
    await charges.charge.trigger.click();
    await charges.charge.choose(2);
    await expect(charges.amount).toHaveValue('25.5');
    await expect(charges.dueDate).toHaveValue(await browserToday(page));
    await expect(charges.submit).toBeEnabled();
    await checkA11y();
    await charges.amount.fill('');
    await expect(charges.submit).toBeDisabled();
    await charges.amount.fill('0');
    await expect(charges.submit).toBeDisabled();
  });

  test('saves the charge and lists it as outstanding', async ({ page }) => {
    spec('P1-CLIENTS-001/2');
    const api = await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(2);
    await expect(new ScreenState(page).empty).toBeVisible();
    await charges.add.click();
    await charges.charge.choose(1);
    await charges.amount.fill('80');
    await charges.dueDate.fill('2026-11-15');
    await charges.submit.click();
    await expect(charges.submit).toHaveCount(0);
    await expect(charges.rows).toHaveCount(1);
    await expect(charges.row(10)).toContainText('Membership fee');
    await expect(charges.row(10)).toContainText('2026-11-15');
    await expect(charges.row(10)).toContainText('Outstanding 80.00');
    await expect(charges.status(10)).toHaveText('Outstanding');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/clients/2/charges')!;
    expect(post.body).toEqual({ chargeId: 1, amount: 80, dueDate: '2026-11-15', ...ISO });
  });

  test('shows a refused due date under the due date', async ({ page }) => {
    spec('P1-CLIENTS-001/3');
    await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(2);
    await charges.add.click();
    await charges.charge.choose(1);
    await charges.amount.fill('12.5');
    await charges.dueDate.fill('2024-01-01');
    await charges.submit.click();
    await expect(charges.fieldError(TID.chargeForm.dueDate)).toContainText(
      'dueDate.before.activationDate',
    );
    await expect(charges.amount).toHaveValue('12.5');
    await expect(charges.dueDate).toHaveValue('2024-01-01');
    await expect(new ScreenState(page).empty).toBeVisible();
  });

  test('is offered only for an active client, to a user who may add charges', async ({ page }) => {
    spec('P1-CLIENTS-001/4');
    await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(3);
    await expect(new ScreenState(page).empty).toBeVisible();
    await expect(charges.add).toHaveCount(0);
    await charges.open(2);
    await expect(charges.add).toBeVisible();

    await page.evaluate(() => sessionStorage.clear());
    await signIn(page, 'chargeReader');
    await charges.open(2);
    await expect(new ScreenState(page).empty).toBeVisible();
    await expect(charges.add).toHaveCount(0);
  });
});

test.describe('client charge operations', () => {
  test("lists a client's charges, from the client's page", async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-002/1');
    await signIn(page);
    const client = new ClientPage(page);
    await client.open(1);
    await client.chargesLink.click();
    await expect(page).toHaveURL(/\/clients\/1\/charges$/);
    const charges = new ChargesPage(page);
    await expect(charges.rows).toHaveCount(3);
    await expect(charges.row(1)).toContainText('Membership fee');
    await expect(charges.row(1)).toContainText('2026-02-15');
    await expect(charges.row(1)).toContainText('Amount 100.00');
    await expect(charges.row(1)).toContainText('Paid 30.00');
    await expect(charges.row(1)).toContainText('Outstanding 70.00');
    await expect(charges.status(1)).toHaveText('Outstanding');
    await expect(charges.row(2)).toContainText('Penalty');
    await expect(charges.row(1)).not.toContainText('Penalty');
    await expect(charges.status(3)).toHaveText('Waived');
    await checkA11y();
    await charges.open(2);
    await expect(new ScreenState(page).empty).toBeVisible();
  });

  test('pays part of a charge', async ({ page }) => {
    spec('P1-CLIENTS-002/2');
    const api = await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(1);
    await charges.pay(2).click();
    await expect(charges.payAmount).toHaveValue('25.5');
    const today = await browserToday(page);
    await expect(charges.payDate).toHaveValue(today);
    await charges.payAmount.fill('10');
    await charges.paySubmit.click();
    await expect(charges.paySubmit).toHaveCount(0);
    await expect(charges.row(2)).toContainText('Paid 10.00');
    await expect(charges.row(2)).toContainText('Outstanding 15.50');
    await expect(charges.status(2)).toHaveText('Outstanding');
    await expect(charges.pay(2)).toBeVisible();
    const post = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/v1/clients/1/charges/2',
    )!;
    expect(post.query).toEqual({ command: 'paycharge' });
    expect(post.body).toEqual({ amount: 10, transactionDate: today, ...ISO });
  });

  test('shows a refused payment in the row', async ({ page }) => {
    spec('P1-CLIENTS-002/3');
    await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(1);
    await charges.pay(2).click();
    await charges.payAmount.fill('500');
    await charges.paySubmit.click();
    await expect(charges.rowError).toContainText('amount.paid.in.access');
    await expect(charges.payAmount).toHaveValue('500');
    await expect(charges.row(2)).toContainText('Outstanding 25.50');
  });

  test('waives a charge once confirmed', async ({ page }) => {
    spec('P1-CLIENTS-002/4');
    const api = await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(1);
    await charges.waive(2).click();
    await charges.cancelConfirm.click();
    await expect(charges.status(2)).toHaveText('Outstanding');
    expect(api.calls.filter((c) => c.path === '/v1/clients/1/charges/2')).toHaveLength(0);
    await charges.waive(2).click();
    await charges.confirmWaive.click();
    await expect(charges.status(2)).toHaveText('Waived');
    await expect(charges.pay(2)).toHaveCount(0);
    await expect(charges.waive(2)).toHaveCount(0);
    await expect(charges.remove(2)).toHaveCount(0);
    const post = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/v1/clients/1/charges/2',
    )!;
    expect(post.query).toEqual({ command: 'waive' });
    expect(post.body ?? {}).toEqual({});
  });

  test('deletes only a charge with nothing paid or waived', async ({ page }) => {
    spec('P1-CLIENTS-002/5');
    const api = await signIn(page);
    const charges = new ChargesPage(page);
    await charges.open(1);
    await expect(charges.rows).toHaveCount(3);
    await expect(charges.remove(1)).toHaveCount(0);
    await expect(charges.remove(3)).toHaveCount(0);
    await charges.remove(2).click();
    await charges.confirmRemove.click();
    await expect(charges.rows).toHaveCount(2);
    await expect(charges.row(2)).toHaveCount(0);
    expect(
      api.calls.some((c) => c.method === 'DELETE' && c.path === '/v1/clients/1/charges/2'),
    ).toBe(true);
  });

  test('follow the client charge permissions', async ({ page }) => {
    spec('P1-CLIENTS-002/6');
    await signIn(page, 'clerk');
    const client = new ClientPage(page);
    await client.open(1);
    await expect(client.name).toHaveText('Ada Lovelace');
    await expect(client.chargesLink).toHaveCount(0);
    await page.goto('/clients/1/charges');
    await expect(new AccessDeniedPage(page).required).toContainText('READ_CLIENTCHARGE');

    await page.evaluate(() => sessionStorage.clear());
    await signIn(page, 'chargeReader');
    const charges = new ChargesPage(page);
    await charges.open(1);
    await expect(charges.rows).toHaveCount(3);
    await expect(charges.add).toHaveCount(0);
    await expect(charges.pay(2)).toHaveCount(0);
    await expect(charges.waive(2)).toHaveCount(0);
    await expect(charges.remove(2)).toHaveCount(0);
  });

  test('a charge load failure offers to try again', async ({ page }) => {
    spec('P1-CLIENTS-002/7');
    await signIn(page, 'chargeAdmin', { failListOnce: true });
    const charges = new ChargesPage(page);
    await charges.open(1);
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await state.retry.click();
    await expect(charges.rows).toHaveCount(3);
  });
});
