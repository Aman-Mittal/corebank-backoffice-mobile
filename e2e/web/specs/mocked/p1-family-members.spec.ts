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
import { familyHandlers } from '../../mocks/family';
import { signInAs, type Persona } from '../../mocks/personas';
import { ClientPage } from '../../pages/clients.page';
import { FamilyPage } from '../../pages/family.page';
import { ScreenState } from '../../pages/organization.page';
import { AccessDeniedPage } from '../../pages/shell.page';

const signIn = (page: Page, persona: Persona = 'familyAdmin', options = {}) =>
  signInAs(page, persona, { ...clientsHandlers(), ...familyHandlers(options) });

test.describe('client family members', () => {
  test("lists a client's family, from the client's page", async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-019/1');
    await signIn(page);
    const client = new ClientPage(page);
    await client.open(1);
    await client.familyLink.click();
    await expect(page).toHaveURL(/\/clients\/1\/family$/);
    const family = new FamilyPage(page);
    await expect(family.rows).toHaveCount(2);
    for (const text of ['Mary Ann Lovelace', 'Spouse', 'Female', 'Teacher', '5550101', '34']) {
      await expect(family.row(7)).toContainText(text);
    }
    await expect(family.row(7)).toContainText('1992-04-03');
    await expect(family.row(8)).toContainText('Son');
    await expect(family.row(8)).toContainText('Dependent');
    await expect(family.row(8)).not.toContainText('Female');
    await checkA11y();
    await family.open(2);
    await expect(new ScreenState(page).empty).toBeVisible();
  });

  test('adds a member with only the fields given', async ({ page, checkA11y }) => {
    spec('P1-CLIENTS-019/2');
    const api = await signIn(page);
    const family = new FamilyPage(page);
    await family.open(2);
    await family.add.click();
    await expect(family.submit).toBeDisabled();
    await family.firstName.fill('  Ann ');
    await family.lastName.fill('Acme');
    await expect(family.submit).toBeDisabled();
    await family.relationship.trigger.click();
    await expect(page.getByTestId(TID.option(TID.familyForm.relationship, 26))).toContainText(
      'Spouse',
    );
    await family.relationship.trigger.click();
    await family.relationship.choose(26);
    await family.gender.choose(28);
    await family.age.fill('41');
    await checkA11y();
    await family.submit.click();
    await expect(family.rows).toHaveCount(1);
    await expect(family.rows.first()).toContainText('Ann Acme');
    await expect(family.rows.first()).toContainText('Female');
    const post = api.calls.find(
      (c) => c.method === 'POST' && c.path === '/v1/clients/2/familymembers',
    )!;
    expect(post.body).toEqual({
      firstName: 'Ann',
      lastName: 'Acme',
      age: 41,
      relationshipId: 26,
      genderId: 28,
      isDependent: false,
    });
  });

  test('edits a member, sending every field and 0 for choices not made', async ({ page }) => {
    spec('P1-CLIENTS-019/3');
    const api = await signIn(page);
    const family = new FamilyPage(page);
    await family.open(1);
    await family.edit(8).click();
    await expect(family.firstName).toHaveValue('Tom');
    await family.age.fill('9.5');
    await expect(family.submit).toBeDisabled();
    await family.age.fill('');
    await family.lastName.fill('Byron');
    await family.submit.click();
    await expect(family.row(8)).toContainText('Tom Byron');
    const put = api.calls.find(
      (c) => c.method === 'PUT' && c.path === '/v1/clients/1/familymembers/8',
    )!;
    expect(put.body).toEqual({
      firstName: 'Tom',
      lastName: 'Byron',
      relationshipId: 27,
      genderId: 0,
      maritalStatusId: 0,
      professionId: 0,
      isDependent: true,
    });
  });

  test('deletes a member once confirmed', async ({ page }) => {
    spec('P1-CLIENTS-019/4');
    const api = await signIn(page);
    const family = new FamilyPage(page);
    await family.open(1);
    await family.remove(7).click();
    await family.cancelRemove.click();
    await expect(family.rows).toHaveCount(2);
    expect(api.calls.filter((c) => c.method === 'DELETE')).toHaveLength(0);
    await family.remove(7).click();
    await family.confirmRemove.click();
    await expect(family.rows).toHaveCount(1);
    expect(
      api.calls.some((c) => c.method === 'DELETE' && c.path === '/v1/clients/1/familymembers/7'),
    ).toBe(true);
  });

  test('needs a relationship to exist, and follows the family permissions', async ({ page }) => {
    spec('P1-CLIENTS-019/5');
    await signIn(page, 'familyAdmin', { noRelationships: true });
    const family = new FamilyPage(page);
    await family.open(2);
    await family.add.click();
    await expect(family.noRelationships).toBeVisible();
    await family.firstName.fill('Ann');
    await family.lastName.fill('Acme');
    await expect(family.submit).toBeDisabled();

    await page.evaluate(() => sessionStorage.clear());
    await signIn(page, 'clerk');
    const client = new ClientPage(page);
    await client.open(1);
    await expect(client.name).toHaveText('Ada Lovelace');
    await expect(client.familyLink).toHaveCount(0);
    await page.goto('/clients/1/family');
    await expect(new AccessDeniedPage(page).required).toContainText('READ_FAMILYMEMBERS');

    await page.evaluate(() => sessionStorage.clear());
    await signIn(page, 'familyReader');
    await family.open(1);
    await expect(family.rows).toHaveCount(2);
    await expect(family.add).toHaveCount(0);
    await expect(family.edit(7)).toHaveCount(0);
    await expect(family.remove(7)).toHaveCount(0);
  });
});
