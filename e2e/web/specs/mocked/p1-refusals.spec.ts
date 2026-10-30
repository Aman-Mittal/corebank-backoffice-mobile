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
import { clientsHandlers } from '../../mocks/clients';
import { organizationHandlers } from '../../mocks/organization';
import { signInAs } from '../../mocks/personas';
import { ScreenState } from '../../pages/organization.page';

/** The server's refusal of a read the role does not cover, as captured from the e2e stack. */
const notAuthorized = {
  status: 403,
  body: {
    developerMessage:
      'The user associated with credentials passed on this request does not have sufficient privileges to perform this action.',
    httpStatusCode: '403',
    defaultUserMessage: 'Insufficient privileges to perform this action.',
    userMessageGlobalisationCode: 'error.msg.not.authorized',
    errors: [
      {
        developerMessage: 'User has no authority to READ offices',
        defaultUserMessage: 'User has no authority to READ offices',
        userMessageGlobalisationCode: 'error.msg.not.authorized',
        parameterName: 'id',
        args: [],
      },
    ],
  },
};

/** Serves the deployment's `config.json` with the app's own gates switched off. */
const gatesOff = (page: Page) =>
  page.route('**/config.json*', (route) => route.fulfill({ json: { rbacEnabled: false } }));

const byId = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.describe('client-side gates switched off', () => {
  test('the navigation and the route guard admit every module', async ({ page }) => {
    spec('P1-SHELL-030/1');
    await gatesOff(page);
    await signInAs(page, 'clerk', organizationHandlers());
    await expect(byId(page, TID.shell.navGroup('organization')).first()).toBeAttached();
    await expect(byId(page, TID.shell.navGroup('security')).first()).toBeAttached();
    await page.goto('/organization/offices');
    await expect(byId(page, TID.offices.screen)).toBeVisible();
    await expect(byId(page, TID.accessDenied.screen)).toHaveCount(0);
  });

  test('a refused list says so without a retry, and a covered list loads', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-SHELL-030/2');
    await gatesOff(page);
    await signInAs(page, 'clerk', {
      ...organizationHandlers(),
      ...clientsHandlers(),
      // Last: clientsHandlers answers the offices list too.
      'GET /v1/offices': () => notAuthorized,
    });
    const state = new ScreenState(page);
    await page.goto('/organization/offices');
    await expect(state.error).toContainText('Your role does not cover this.');
    await expect(state.retry).toHaveCount(0);
    await checkA11y();
    await page.goto('/clients');
    await expect(byId(page, TID.clients.row(1))).toBeVisible();
    await expect(state.error).toHaveCount(0);
  });
});

test.describe('refused reads, gates on', () => {
  test('a server failure offers a retry, a refusal does not', async ({ page }) => {
    spec('P1-SHELL-030/3');
    await signInAs(page, 'officeAdmin', organizationHandlers({ failOfficesOnce: true }));
    const state = new ScreenState(page);
    await page.goto('/organization/offices');
    await expect(state.retry).toBeVisible();

    await page.evaluate(() => sessionStorage.clear());
    await signInAs(page, 'officeAdmin', {
      ...organizationHandlers(),
      'GET /v1/offices': () => notAuthorized,
    });
    await page.goto('/organization/offices');
    await expect(state.error).toContainText('Your role does not cover this.');
    await expect(state.retry).toHaveCount(0);
  });
});
