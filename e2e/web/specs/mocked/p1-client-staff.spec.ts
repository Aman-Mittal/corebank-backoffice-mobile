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
import { CLIENTS, clientsHandlers, LIFECYCLE_CLIENTS } from '../../mocks/clients';
import { signInAs, type Persona } from '../../mocks/personas';
import { ClientPage } from '../../pages/clients.page';

type Options = Parameters<typeof clientsHandlers>[0];

async function openClient(
  page: Page,
  id: number,
  persona: Persona = 'staffAssigner',
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

const staffCommands = (api: Awaited<ReturnType<typeof openClient>>['api']) =>
  api.calls.filter((c) => c.method === 'POST' && /^\/v1\/clients\/\d+$/.test(c.path));

test.describe('client staff assignment', () => {
  test("shows the client's loan officer", async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-007/1');
    const { view } = await openClient(page, 1);
    await expect(view.staff).toContainText('Director, Program');
    await checkA11y();
    await view.open(3);
    await expect(view.name).toHaveText('Grace Hopper');
    await expect(view.staff).toHaveCount(0);
  });

  test('assigns a member of staff from the office template', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-007/2');
    const { api, view } = await openClient(page, 3);
    await view.assignStaff.click();
    const template = api.calls.find((c) => c.path === '/v1/clients/template')!;
    expect(template.query).toEqual({ officeId: '1' });
    await expect(view.staffConfirm).toBeDisabled();
    await view.staffSelect.choose(4);
    await expect(view.staffConfirm).toBeEnabled();
    await checkA11y();
    await view.staffConfirm.click();
    await expect(view.staff).toContainText('Officer, Probe');
    const [post] = staffCommands(api);
    expect(post!.query).toEqual({ command: 'assignStaff' });
    expect(post!.body).toEqual({ staffId: 4 });
  });

  test('unassigns the officer, echoing them back, once confirmed', async ({ page }) => {
    spec('P1-CLIENTS-007/3');
    const { api, view } = await openClient(page, 1);
    await view.unassignStaff.click();
    await view.unassignCancel.click();
    await expect(view.staff).toContainText('Director, Program');
    expect(staffCommands(api)).toHaveLength(0);
    await view.unassignStaff.click();
    await view.unassignConfirm.click();
    await expect(view.staff).toHaveCount(0);
    const [post] = staffCommands(api);
    expect(post!.query).toEqual({ command: 'unassignStaff' });
    expect(post!.body).toEqual({ staffId: 1 });
  });

  test('says when the office has no staff to assign', async ({ page }) => {
    spec('P1-CLIENTS-007/4');
    const { view } = await openClient(page, 3, 'staffAssigner', { noStaff: true });
    await view.assignStaff.click();
    await expect(view.staffNone).toBeVisible();
    await expect(view.staffConfirm).toBeDisabled();
  });

  test('is offered by permission, status and whether someone is assigned', async ({ page }) => {
    spec('P1-CLIENTS-007/5');
    const { view } = await openClient(page, 3);
    await expect(view.assignStaff).toBeVisible();
    await expect(view.unassignStaff).toHaveCount(0);
    await view.open(5);
    await expect(view.name).toHaveText('Alan Turing');
    await expect(view.assignStaff).toHaveCount(0);

    await page.evaluate(() => sessionStorage.clear());
    await openClient(page, 1, 'clerk');
    await expect(view.staff).toContainText('Director, Program');
    await expect(view.assignStaff).toHaveCount(0);
    await expect(view.unassignStaff).toHaveCount(0);
  });
});
