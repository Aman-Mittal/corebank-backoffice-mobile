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
import { CLIENTS, clientsHandlers, LIFECYCLE_CLIENTS } from '../../mocks/clients';
import { signInAs, type Persona } from '../../mocks/personas';
import { ClientPage } from '../../pages/clients.page';

const ISO = { dateFormat: 'yyyy-MM-dd', locale: 'en' };
const browserToday = (page: Page) => page.evaluate(() => new Date().toLocaleDateString('en-CA'));

const signIn = (page: Page, persona: Persona = 'transferAdmin', options = {}) =>
  signInAs(
    page,
    persona,
    clientsHandlers({ clients: [...CLIENTS, ...LIFECYCLE_CLIENTS], ...options }),
  );

const commandCalls = (api: Awaited<ReturnType<typeof signIn>>, clientId: number, name: string) =>
  api.calls.filter(
    (c) => c.method === 'POST' && c.path === `/v1/clients/${clientId}` && c.query.command === name,
  );

test.describe('client transfer', () => {
  test('proposes a transfer to another office', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-008/1');
    const api = await signIn(page);
    const view = new ClientPage(page);
    await view.open(1);
    await view.transfer('proposeTransfer').click();
    await expect(view.transferConfirm).toBeDisabled();
    await expect(view.transferDate).toHaveValue(await browserToday(page));
    await view.transferOffice.trigger.click();
    await expect(page.getByTestId(TID.option(TID.client.transferOffice, 1))).toHaveCount(0);
    await expect(page.getByTestId(TID.option(TID.client.transferOffice, 2))).toContainText(
      'Kampala Branch',
    );
    await expect(page.getByTestId(TID.option(TID.client.transferOffice, 3))).toContainText(
      'Entebbe Sub-branch',
    );
    await view.transferOffice.trigger.click();
    await view.transferOffice.choose(2);
    await view.transferDate.fill('2026-10-01');
    await view.transferNote.fill('  Moving closer to family  ');
    await checkA11y();
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Transfer in progress');
    await expect(view.transferTo).toContainText('Kampala Branch');
    await expect(view.office).toContainText('Head Office');
    const [post] = commandCalls(api, 1, 'proposeTransfer');
    expect(post!.body).toEqual({
      destinationOfficeId: 2,
      transferDate: '2026-10-01',
      note: 'Moving closer to family',
      ...ISO,
    });
  });

  test('accepts a transfer in progress, moving the client', async ({ page }) => {
    spec('P1-CLIENTS-008/2');
    const api = await signIn(page);
    const view = new ClientPage(page);
    await view.open(7);
    await expect(view.transferTo).toContainText('Kampala Branch');
    await view.transfer('acceptTransfer').click();
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Active');
    await expect(view.office).toContainText('Kampala Branch');
    await expect(view.transferTo).toHaveCount(0);
    const [post] = commandCalls(api, 7, 'acceptTransfer');
    expect(post!.body ?? {}).toEqual({});
  });

  test('a rejected transfer is on hold until it is withdrawn', async ({ page }) => {
    spec('P1-CLIENTS-008/3');
    const api = await signIn(page);
    const view = new ClientPage(page);
    await view.open(7);
    await view.transfer('rejectTransfer').click();
    await view.transferNote.fill('Branch is full');
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Transfer on hold');
    await expect(view.office).toContainText('Head Office');
    await expect(view.transfer('acceptTransfer')).toHaveCount(0);
    await expect(view.transfer('rejectTransfer')).toHaveCount(0);
    expect(commandCalls(api, 7, 'rejectTransfer')[0]!.body).toEqual({ note: 'Branch is full' });
    await view.transfer('withdrawTransfer').click();
    await view.transferConfirm.click();
    await expect(view.status).toContainText('Active');
    await expect(view.office).toContainText('Head Office');
  });

  test('transfers at once, sending no date', async ({ page }) => {
    spec('P1-CLIENTS-008/4');
    const api = await signIn(page);
    const view = new ClientPage(page);
    await view.open(1);
    await view.transfer('proposeAndAcceptTransfer').click();
    await expect(view.transferDate).toHaveCount(0);
    await view.transferOffice.choose(3);
    await view.transferConfirm.click();
    await expect(view.office).toContainText('Entebbe Sub-branch');
    await expect(view.status).toContainText('Active');
    expect(commandCalls(api, 1, 'proposeAndAcceptTransfer')[0]!.body).toEqual({
      destinationOfficeId: 3,
    });
  });

  test('cancels, shows refusals, and follows the transfer permissions', async ({ page }) => {
    spec('P1-CLIENTS-008/5');
    const api = await signIn(page, 'transferAdmin', {
      refuseCommand: {
        status: 403,
        body: {
          developerMessage: 'Request was understood but caused a domain rule violation.',
          httpStatusCode: '403',
          defaultUserMessage: 'Errors contain reason for domain rule violation.',
          userMessageGlobalisationCode: 'validation.msg.domain.rule.violation',
          errors: [
            {
              developerMessage: 'The Client with id `7` is not awaiting transfer',
              defaultUserMessage: 'The Client with id `7` is not awaiting transfer',
              userMessageGlobalisationCode:
                'error.msg.client.not.awaiting.transfer.approval.exception',
              parameterName: 'id',
            },
          ],
        },
      },
    });
    const view = new ClientPage(page);
    await view.open(7);
    await view.transfer('withdrawTransfer').click();
    await view.transferCancel.click();
    await expect(view.transferConfirm).toHaveCount(0);
    expect(commandCalls(api, 7, 'withdrawTransfer')).toHaveLength(0);
    await view.transfer('acceptTransfer').click();
    await view.transferConfirm.click();
    await expect(view.transferError).toContainText('is not awaiting transfer');

    await page.evaluate(() => sessionStorage.clear());
    await signIn(page, 'clerk');
    await view.open(1);
    await expect(view.name).toHaveText('Ada Lovelace');
    await expect(view.transfer('proposeTransfer')).toHaveCount(0);
    await expect(view.transfer('proposeAndAcceptTransfer')).toHaveCount(0);

    await page.evaluate(() => sessionStorage.clear());
    await signIn(page, 'transferProposer');
    await view.open(1);
    await expect(view.transfer('proposeTransfer')).toBeVisible();
    await expect(view.transfer('proposeAndAcceptTransfer')).toHaveCount(0);
    await view.open(7);
    await expect(view.transferTo).toContainText('Kampala Branch');
    await expect(view.transfer('acceptTransfer')).toHaveCount(0);
    await expect(view.transfer('withdrawTransfer')).toHaveCount(0);
  });
});
