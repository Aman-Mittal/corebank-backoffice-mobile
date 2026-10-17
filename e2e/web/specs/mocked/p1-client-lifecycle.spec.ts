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

import { expect, spec, test } from '../../fixtures';
import {
  CLIENTS,
  clientsHandlers,
  domainRefusal,
  LIFECYCLE_CLIENTS,
  REASONS,
} from '../../mocks/clients';
import { signInAs, type Persona } from '../../mocks/personas';
import { ClientPage } from '../../pages/clients.page';

/** Today in the browser's calendar (the pinned time zone), as the panel defaults it. */
const browserToday = (page: Page) => page.evaluate(() => new Date().toLocaleDateString('en-CA'));

type Options = Parameters<typeof clientsHandlers>[0];

async function openClient(
  page: Page,
  id: number,
  persona: Persona = 'clientAdmin',
  options?: Options,
) {
  const api = await signInAs(
    page,
    persona,
    clientsHandlers({ clients: [...CLIENTS, ...LIFECYCLE_CLIENTS], ...options }),
  );
  const view = new ClientPage(page);
  await view.open(id);
  await expect(view.name).toBeVisible();
  return { api, view };
}

const commandPost = (api: Awaited<ReturnType<typeof openClient>>['api'], id: number) =>
  api.calls.filter((c) => c.method === 'POST' && c.path === `/v1/clients/${id}`);

const ISO = { dateFormat: 'yyyy-MM-dd', locale: 'en' };

test.describe('client lifecycle: available actions', () => {
  test('each status offers exactly its actions', async ({ page }) => {
    spec('P1-CLIENTS-012/1');
    const { view } = await openClient(page, 3);
    const expected: [number, string[]][] = [
      [3, ['activate', 'reject', 'withdraw']],
      [1, ['close']],
      [5, ['reactivate']],
      [4, ['undoRejection']],
      [6, ['undoWithdrawal']],
      [7, []],
    ];
    for (const [id, commands] of expected) {
      await view.open(id);
      await expect(view.name).toBeVisible();
      await expect(view.actions).toHaveCount(commands.length);
      for (const command of commands) await expect(view.action(command)).toBeVisible();
    }
  });

  test('each action needs its own permission', async ({ page }) => {
    spec('P1-CLIENTS-012/2');
    const { view } = await openClient(page, 3, 'clientRejecter');
    await expect(view.actions).toHaveCount(1);
    await expect(view.action('reject')).toBeVisible();
    await view.open(1);
    await expect(view.name).toHaveText('Ada Lovelace');
    await expect(view.actions).toHaveCount(0);

    await page.evaluate(() => sessionStorage.clear());
    await openClient(page, 3, 'clerk');
    await expect(view.status).toContainText('Pending');
    await expect(view.actions).toHaveCount(0);
  });

  test("shows the server's refusal and reloads a client that changed elsewhere", async ({
    page,
  }) => {
    spec('P1-CLIENTS-012/3');
    const { view } = await openClient(page, 3, 'clientAdmin', {
      changedElsewhere: { 3: 'active' },
    });
    await expect(view.status).toContainText('Pending');
    await view.action('reject').click();
    await view.actionReason.choose(31);
    await view.actionConfirm.click();
    await expect(view.actionError).toContainText('Only pending clients');
    await expect(view.status).toContainText('Active');
    await expect(view.action('close')).toBeVisible();
  });
});

test.describe('client lifecycle: reject and undo', () => {
  test('rejects a pending client with a reason from the template', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-014/1');
    const { api, view } = await openClient(page, 3);
    await view.action('reject').click();
    const today = await browserToday(page);
    await expect(view.actionDate).toHaveValue(today);
    const template = api.calls.find((c) => c.path === '/v1/clients/template')!;
    expect(template.query).toEqual({ commandParam: 'reject' });
    await expect(view.actionConfirm).toBeDisabled();
    await view.actionReason.trigger.click();
    for (const reason of REASONS.reject) {
      await expect(page.getByText(reason.name).filter({ visible: true })).toBeVisible();
    }
    await view.actionReason.trigger.click();
    await view.actionReason.choose(32);
    await expect(view.actionConfirm).toBeEnabled();
    await checkA11y();
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Rejected');
    await expect(view.action('undoRejection')).toBeVisible();
    const [post] = commandPost(api, 3);
    expect(post!.query).toEqual({ command: 'reject' });
    expect(post!.body).toEqual({ rejectionDate: today, rejectionReasonId: 32, ...ISO });
  });

  test('says when no rejection reasons are set up', async ({ page }) => {
    spec('P1-CLIENTS-014/2');
    const { view } = await openClient(page, 3, 'clientAdmin', { noReasons: true });
    await view.action('reject').click();
    await expect(view.actionNoReasons).toBeVisible();
    await expect(view.actionNoReasons).toContainText('ClientRejectReason');
    await expect(view.actionConfirm).toBeDisabled();
  });

  test('undoes a rejection', async ({ page }) => {
    spec('P1-CLIENTS-015/1');
    const { api, view } = await openClient(page, 4);
    await expect(view.status).toContainText('Rejected');
    await view.action('undoRejection').click();
    await expect(view.actionReason.trigger).toHaveCount(0);
    const today = await browserToday(page);
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Pending');
    for (const command of ['activate', 'reject', 'withdraw']) {
      await expect(view.action(command)).toBeVisible();
    }
    const [post] = commandPost(api, 4);
    expect(post!.query).toEqual({ command: 'undoRejection' });
    expect(post!.body).toEqual({ reopenedDate: today, ...ISO });
  });
});

test.describe('client lifecycle: withdraw and undo', () => {
  test('withdraws a pending client with a reason', async ({ page }) => {
    spec('P1-CLIENTS-016/1');
    const { api, view } = await openClient(page, 3);
    await view.action('withdraw').click();
    const today = await browserToday(page);
    await view.actionReason.choose(41);
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Withdrawn');
    await expect(view.action('undoWithdrawal')).toBeVisible();
    const [post] = commandPost(api, 3);
    expect(post!.query).toEqual({ command: 'withdraw' });
    expect(post!.body).toEqual({ withdrawalDate: today, withdrawalReasonId: 41, ...ISO });
  });

  test('undoes a withdrawal', async ({ page }) => {
    spec('P1-CLIENTS-016/2');
    const { api, view } = await openClient(page, 6);
    await view.action('undoWithdrawal').click();
    const today = await browserToday(page);
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Pending');
    const [post] = commandPost(api, 6);
    expect(post!.query).toEqual({ command: 'undoWithdrawal' });
    expect(post!.body).toEqual({ reopenedDate: today, ...ISO });
  });
});

test.describe('client lifecycle: close and reactivate', () => {
  test('closes an active client', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-017/1');
    const { api, view } = await openClient(page, 1);
    await view.action('close').click();
    await view.actionDate.fill('2026-10-02');
    await view.actionReason.choose(51);
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Closed');
    await expect(view.closedOn).toContainText('2026-10-02');
    await expect(view.action('reactivate')).toBeVisible();
    await checkA11y();
    const [post] = commandPost(api, 1);
    expect(post!.query).toEqual({ command: 'close' });
    expect(post!.body).toEqual({ closureDate: '2026-10-02', closureReasonId: 51, ...ISO });
    expect(post!.body).not.toHaveProperty('closedOnDate');
  });

  test('keeps Confirm disabled until the date and the reason are valid', async ({ page }) => {
    spec('P1-CLIENTS-017/2');
    const { view } = await openClient(page, 1);
    await view.action('close').click();
    await expect(view.actionConfirm).toBeDisabled();
    await view.actionReason.choose(52);
    await expect(view.actionConfirm).toBeEnabled();
    await view.actionDate.fill('2026-02-30');
    await expect(view.actionConfirm).toBeDisabled();
    await expect(page.getByText('YYYY-MM-DD').filter({ visible: true }).first()).toBeVisible();
    await view.actionDate.fill('2026-02-28');
    await expect(view.actionConfirm).toBeEnabled();
  });

  test('cancel closes the panel and sends nothing', async ({ page }) => {
    spec('P1-CLIENTS-017/3');
    const { api, view } = await openClient(page, 1);
    await view.action('close').click();
    await view.actionReason.choose(51);
    await view.actionCancel.click();
    await expect(view.actionConfirm).toHaveCount(0);
    await expect(view.action('close')).toBeVisible();
    await expect(view.status).toContainText('Active');
    expect(commandPost(api, 1)).toHaveLength(0);
  });

  test("shows the server's refusal to close a client with open loans", async ({ page }) => {
    spec('P1-CLIENTS-017/4');
    const message = 'Client cannot be closed because of non-closed loans.';
    const { view } = await openClient(page, 1, 'clientAdmin', {
      refuseCommand: domainRefusal('error.msg.client.close.loan.non-closed', message),
    });
    await view.action('close').click();
    await view.actionDate.fill('2026-10-02');
    await view.actionReason.choose(52);
    await view.actionConfirm.click();
    await expect(view.actionError).toHaveText(message);
    await expect(view.actionDate).toHaveValue('2026-10-02');
    await expect(view.actionReason.trigger).toContainText('Deceased');
    await expect(view.status).toContainText('Active');
  });

  test('reactivates a closed client', async ({ page }) => {
    spec('P1-CLIENTS-013/1');
    const { api, view } = await openClient(page, 5);
    await expect(view.closedOn).toContainText('2026-09-30');
    await view.action('reactivate').click();
    const today = await browserToday(page);
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Pending');
    await expect(view.action('activate')).toBeVisible();
    const [post] = commandPost(api, 5);
    expect(post!.query).toEqual({ command: 'reactivate' });
    expect(post!.body).toEqual({ reactivationDate: today, ...ISO });
  });
});
