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
import { kycHandlers } from '../../mocks/kyc';
import { signInAs, type Persona } from '../../mocks/personas';
import { ClientPage } from '../../pages/clients.page';
import { IdentifiersPage, NotesPage } from '../../pages/kyc.page';
import { ScreenState } from '../../pages/organization.page';
import { AccessDeniedPage } from '../../pages/shell.page';

const signIn = (page: Page, persona: Persona = 'kycAdmin', options = {}) =>
  signInAs(page, persona, { ...clientsHandlers(), ...kycHandlers(options) });

test.describe('client identifiers', () => {
  test("lists a client's identifiers, from the client's page", async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-020/1');
    await signIn(page);
    const client = new ClientPage(page);
    await client.open(1);
    await client.identifiersLink.click();
    await expect(page).toHaveURL(/\/clients\/1\/identifiers$/);
    const ids = new IdentifiersPage(page);
    await expect(ids.rows).toHaveCount(1);
    await expect(ids.row(1)).toContainText('Passport');
    await expect(ids.row(1)).toContainText('P-ADA-1');
    await expect(ids.row(1)).toContainText('Issued in London');
    await expect(ids.row(1)).toContainText('Active');
    await checkA11y();
    await ids.open(2);
    await expect(new ScreenState(page).empty).toBeVisible();
  });

  test('adds an identifier with a type from the template', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-020/2');
    const api = await signIn(page);
    const ids = new IdentifiersPage(page);
    await ids.open(1);
    await ids.add.click();
    await expect(ids.submit).toBeDisabled();
    await ids.key.fill('  ID-778  ');
    await expect(ids.submit).toBeDisabled();
    await ids.type.trigger.click();
    for (const [id, name] of [
      [1, 'Passport'],
      [2, 'Id'],
      [3, 'Drivers License'],
      [4, 'Any Other Id Type'],
    ] as const) {
      await expect(page.getByTestId(TID.option(TID.identifierForm.type, id))).toContainText(name);
    }
    await ids.type.trigger.click();
    await ids.type.choose(2);
    await expect(ids.submit).toBeEnabled();
    await checkA11y();
    await ids.submit.click();
    await expect(ids.rows).toHaveCount(2);
    await expect(ids.row(10)).toContainText('ID-778');
    await expect(ids.row(10)).toContainText('Id');
    await expect(ids.submit).toHaveCount(0);
    const post = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/v1/clients/1/identifiers',
    )!;
    expect(post.body).toEqual({ documentTypeId: 2, documentKey: 'ID-778', status: 'Active' });
  });

  test('shows a refused duplicate key under the key', async ({ page }) => {
    spec('P1-CLIENTS-020/3');
    await signIn(page);
    const ids = new IdentifiersPage(page);
    await ids.open(1);
    await ids.add.click();
    await ids.type.choose(1);
    await ids.key.fill('P-ADA-1');
    await ids.description.fill('Again');
    await ids.submit.click();
    await expect(ids.fieldError(TID.identifierForm.key)).toContainText(
      'already has a Passport with unique key P-ADA-1',
    );
    await expect(ids.key).toHaveValue('P-ADA-1');
    await expect(ids.description).toHaveValue('Again');
    await expect(ids.rows).toHaveCount(1);
  });

  test('deletes an identifier once confirmed', async ({ page }) => {
    spec('P1-CLIENTS-020/4');
    const api = await signIn(page);
    const ids = new IdentifiersPage(page);
    await ids.open(1);
    await ids.remove(1).click();
    await ids.cancelRemove.click();
    await expect(ids.rows).toHaveCount(1);
    expect(api.calls.filter((c) => c.method === 'DELETE')).toHaveLength(0);
    await ids.remove(1).click();
    await ids.confirmRemove.click();
    await expect(new ScreenState(page).empty).toBeVisible();
    expect(
      api.calls.some((c) => c.method === 'DELETE' && c.path === '/v1/clients/1/identifiers/1'),
    ).toBe(true);
  });
});

test.describe('client notes', () => {
  test('lists notes newest first and adds one without a reload', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-020/5');
    const api = await signIn(page);
    const client = new ClientPage(page);
    await client.open(1);
    await client.notesLink.click();
    await expect(page).toHaveURL(/\/clients\/1\/notes$/);
    const notes = new NotesPage(page);
    await expect(notes.rows).toHaveCount(2);
    await expect(notes.rows.first()).toContainText('Asked about a second loan');
    await expect(notes.rows.first()).toContainText('clerk');
    await expect(notes.rows.first()).toContainText('2026-10-05');
    await expect(notes.rows.last()).toContainText('Prefers morning visits');
    await checkA11y();
    await expect(notes.add).toBeDisabled();
    await notes.text.fill(' '.repeat(3));
    await expect(notes.add).toBeDisabled();
    await notes.text.fill('  Visited the shop  ');
    await notes.add.click();
    await expect(notes.rows).toHaveCount(3);
    await expect(notes.rows.first()).toContainText('Visited the shop');
    await expect(notes.text).toHaveValue('');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/clients/1/notes')!;
    expect(post.body).toEqual({ note: 'Visited the shop' });
  });

  test('edits a note, and a cancelled edit keeps the old text', async ({ page }) => {
    spec('P1-CLIENTS-020/6');
    const api = await signIn(page);
    const notes = new NotesPage(page);
    await notes.open(1);
    await notes.edit(1).click();
    await notes.editText.fill('Changed my mind');
    await notes.cancelEdit.click();
    // The edit box is a text area, whose text is what was typed: wait for it to close.
    await expect(notes.editText).toHaveCount(0);
    await expect(notes.row(1)).toContainText('Prefers morning visits');
    expect(api.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    await notes.edit(1).click();
    await expect(notes.editText).toHaveValue('Prefers morning visits');
    await notes.editText.fill('Prefers afternoon visits');
    await notes.save.click();
    await expect(notes.editText).toHaveCount(0);
    await expect(notes.row(1)).toContainText('Prefers afternoon visits');
    const put = api.calls.find((c) => c.method === 'PUT' && c.path === '/v1/clients/1/notes/1')!;
    expect(put.body).toEqual({ note: 'Prefers afternoon visits' });
  });

  test('deletes a note once confirmed', async ({ page }) => {
    spec('P1-CLIENTS-020/7');
    const api = await signIn(page);
    const notes = new NotesPage(page);
    await notes.open(1);
    await notes.remove(2).click();
    await notes.confirmRemove.click();
    await expect(notes.rows).toHaveCount(1);
    await expect(notes.row(2)).toHaveCount(0);
    expect(api.calls.some((c) => c.method === 'DELETE' && c.path === '/v1/clients/1/notes/2')).toBe(
      true,
    );
  });

  test('a note load failure offers to try again', async ({ page }) => {
    spec('P1-CLIENTS-020/9');
    await signIn(page, 'kycAdmin', { failNotesOnce: true });
    const notes = new NotesPage(page);
    await notes.open(1);
    const state = new ScreenState(page);
    await expect(state.error).toBeVisible();
    await state.retry.click();
    await expect(notes.rows).toHaveCount(2);
  });
});

test.describe('client identifiers and notes: permissions', () => {
  test('follow the identifier and note permissions', async ({ page }) => {
    spec('P1-CLIENTS-020/8');
    await signIn(page, 'clerk');
    const client = new ClientPage(page);
    await client.open(1);
    await expect(client.name).toHaveText('Ada Lovelace');
    await expect(client.identifiersLink).toHaveCount(0);
    await expect(client.notesLink).toHaveCount(0);
    await page.goto('/clients/1/notes');
    await expect(new AccessDeniedPage(page).required).toContainText('READ_CLIENTNOTE');

    await page.evaluate(() => sessionStorage.clear());
    await signIn(page, 'kycReader');
    const ids = new IdentifiersPage(page);
    await ids.open(1);
    await expect(ids.rows).toHaveCount(1);
    await expect(ids.add).toHaveCount(0);
    await expect(ids.remove(1)).toHaveCount(0);
    const notes = new NotesPage(page);
    await notes.open(1);
    await expect(notes.rows).toHaveCount(2);
    await expect(notes.text).toHaveCount(0);
    await expect(notes.edit(1)).toHaveCount(0);
    await expect(notes.remove(1)).toHaveCount(0);
  });
});
