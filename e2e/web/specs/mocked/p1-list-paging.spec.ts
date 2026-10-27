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

import type { Handler } from '../../mocks/api';
import { expect, spec, test } from '../../fixtures';
import { clientsHandlers, manyClients } from '../../mocks/clients';
import { organizationHandlers } from '../../mocks/organization';
import { signInAs } from '../../mocks/personas';
import { ClientPage, ClientsPage } from '../../pages/clients.page';
import { OfficesPage, ScreenState, StaffListPage } from '../../pages/organization.page';

/** The `offset` and `displayName` of the latest clients read. */
function lastListRead(api: { calls: { method: string; path: string; query: object }[] }) {
  return api.calls.findLast((c) => c.method === 'GET' && c.path === '/v1/clients')!.query;
}

const fiftyFour = (extra: Parameters<typeof clientsHandlers>[0] = {}): Record<string, Handler> =>
  clientsHandlers({ clients: manyClients(54), ...extra });

test.describe('list paging', () => {
  test('pages forward to the end and back, reading each offset', async ({ page }) => {
    spec('P1-SHELL-018/1');
    const api = await signInAs(page, 'clientAdmin', fiftyFour());
    const list = new ClientsPage(page);
    await list.open();
    await expect(list.range).toHaveText('1–20 of 54');
    await list.next.click();
    await expect(list.range).toHaveText('21–40 of 54');
    expect(lastListRead(api)).toMatchObject({ offset: '20', limit: '20' });
    await list.next.click();
    await expect(list.range).toHaveText('41–54 of 54');
    await expect(list.rows).toHaveCount(14);
    expect(lastListRead(api)).toMatchObject({ offset: '40' });
    await expect(list.next).toBeDisabled();
    await expect(list.last).toBeDisabled();
    await list.previous.click();
    await expect(list.range).toHaveText('21–40 of 54');
  });

  test('jumps to the last page and back to the first', async ({ page }) => {
    spec('P1-SHELL-018/2');
    const api = await signInAs(page, 'clientAdmin', fiftyFour());
    const list = new ClientsPage(page);
    await list.open();
    await expect(list.first).toBeDisabled();
    await list.last.click();
    await expect(list.range).toHaveText('41–54 of 54');
    expect(lastListRead(api)).toMatchObject({ offset: '40' });
    await list.first.click();
    await expect(list.range).toHaveText('1–20 of 54');
    await expect(list.first).toBeDisabled();
    await expect(list.previous).toBeDisabled();
  });

  test('keeps the search while paging; a new search starts at the first page', async ({ page }) => {
    spec('P1-SHELL-018/3');
    const api = await signInAs(page, 'clientAdmin', fiftyFour());
    const list = new ClientsPage(page);
    await list.open();
    await list.search.fill('client');
    // "client" matches all 54, so the range cannot show the search applied; the read can.
    await expect.poll(() => lastListRead(api)).toMatchObject({ displayName: 'client' });
    await expect(list.range).toHaveText('1–20 of 54');
    await list.next.click();
    await expect(list.range).toHaveText('21–40 of 54');
    expect(lastListRead(api)).toMatchObject({ displayName: 'client', offset: '20' });
    await list.search.fill('client 5');
    await expect(list.range).toHaveText('1–5 of 5');
    expect(lastListRead(api)).toMatchObject({ displayName: 'client 5', offset: '0' });
  });

  test('comes back to the page a client was opened from', async ({ page }) => {
    spec('P1-SHELL-018/4');
    await signInAs(page, 'clientAdmin', fiftyFour());
    const list = new ClientsPage(page);
    await list.open();
    await list.next.click();
    await expect(list.range).toHaveText('21–40 of 54');
    await list.row(120).click();
    await expect(new ClientPage(page).name).toHaveText('Client 21');
    await page.goBack();
    await expect(list.range).toHaveText('21–40 of 54');
    await page.goto('/clients?page=9');
    await expect(list.range).toHaveText('41–54 of 54');
  });
});

test.describe('list load failures', () => {
  test('a clients page that cannot be read is an error, not an empty list', async ({ page }) => {
    spec('P1-SHELL-017/1');
    await signInAs(page, 'clientAdmin', clientsHandlers({ unreadableListOnce: true }));
    const list = new ClientsPage(page);
    await list.open();
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await expect(state.empty).toHaveCount(0);
    await state.retry.click();
    await expect(list.rows).toHaveCount(3);
  });

  test('an offices list that cannot be read is an error, not an empty list', async ({ page }) => {
    spec('P1-SHELL-017/2');
    await signInAs(page, 'officeAdmin', organizationHandlers({ unreadableOfficesOnce: true }));
    const list = new OfficesPage(page);
    await list.open();
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await expect(state.empty).toHaveCount(0);
    await state.retry.click();
    await expect(list.rows.first()).toBeVisible();
  });

  test('a staff list that cannot be read is an error, not an empty list', async ({ page }) => {
    spec('P1-SHELL-017/3');
    await signInAs(page, 'staffAdmin', organizationHandlers({ unreadableStaffOnce: true }));
    const list = new StaffListPage(page);
    await list.open();
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await expect(state.empty).toHaveCount(0);
    await state.retry.click();
    await expect(list.rows.first()).toBeVisible();
  });
});
