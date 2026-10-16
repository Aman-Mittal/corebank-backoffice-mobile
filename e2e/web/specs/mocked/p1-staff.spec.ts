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
  ScreenState,
  StaffFormPage,
  StaffListPage,
  StaffMemberPage,
} from '../../pages/organization.page';
import { AccessDeniedPage } from '../../pages/shell.page';

test.describe('staff', () => {
  test('lists active and inactive staff with office, loan-officer mark and status', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-ORG-002/1');
    const api = await signInAs(page, 'staffAdmin', organizationHandlers());
    const list = new StaffListPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(2);
    await expect(list.row(1)).toContainText('Director, Program');
    await expect(list.row(1)).toContainText('Head Office');
    await expect(list.row(1)).toContainText('Loan officer');
    await expect(list.row(1)).toContainText('Active');
    await expect(list.row(2)).toContainText('Okello, Grace');
    await expect(list.row(2)).toContainText('Inactive');
    await expect(list.row(2)).not.toContainText('Loan officer');
    const request = api.calls.find((c) => c.method === 'GET' && c.path === '/v1/staff')!;
    expect(request.query.status).toBe('all');
    await checkA11y();
  });

  test('narrows by office on the server, and by name in the list', async ({ page }) => {
    spec('P1-ORG-002/2');
    const api = await signInAs(page, 'staffAdmin', organizationHandlers());
    const list = new StaffListPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(2);
    await list.officeFilter.choose(2);
    await expect(list.rows).toHaveCount(1);
    await expect(list.row(2)).toBeVisible();
    const filtered = api.calls.findLast((c) => c.method === 'GET' && c.path === '/v1/staff')!;
    expect(filtered.query).toMatchObject({ status: 'all', officeId: '2' });
    await list.officeFilter.choose('all');
    await expect(list.rows).toHaveCount(2);
    await list.search.fill('direc');
    await expect(list.rows).toHaveCount(1);
    await expect(list.row(1)).toBeVisible();
  });

  test('a reader is offered no create control and is refused the create URL', async ({ page }) => {
    spec('P1-ORG-002/3');
    await signInAs(page, 'staffReader', organizationHandlers());
    const list = new StaffListPage(page);
    await list.open();
    await expect(list.rows).toHaveCount(2);
    await expect(list.create).toHaveCount(0);
    await page.goto('/organization/staff/new');
    await expect(new AccessDeniedPage(page).required).toContainText('CREATE_STAFF');
  });

  test('creates staff from the required fields only, omitting the blank optional ones', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-ORG-002/4');
    const api = await signInAs(page, 'staffAdmin', organizationHandlers());
    const list = new StaffListPage(page);
    await list.open();
    await list.create.click();
    await expect(page).toHaveURL(/\/organization\/staff\/new$/);
    const form = new StaffFormPage(page);
    await form.office.choose(1);
    await form.firstname.fill('Ada');
    await form.lastname.fill('Lovelace');
    await form.joiningDate.fill('2026-01-05');
    await expect(form.active).toHaveAttribute('aria-checked', 'true');
    await expect(form.loanOfficer).toHaveAttribute('aria-checked', 'false');
    await checkA11y();
    await form.submit.click();
    await expect(page).toHaveURL(/\/organization\/staff\/3$/);
    await expect(new StaffMemberPage(page).name).toHaveText('Lovelace, Ada');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/v1/staff')!;
    expect(post.body).toEqual({
      officeId: 1,
      firstname: 'Ada',
      lastname: 'Lovelace',
      isActive: true,
      isLoanOfficer: false,
      joiningDate: '2026-01-05',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  test('keeps Save disabled while a field is invalid, and says why', async ({ page }) => {
    spec('P1-ORG-002/5');
    await signInAs(page, 'staffAdmin', organizationHandlers());
    await page.goto('/organization/staff/new');
    const form = new StaffFormPage(page);
    await expect(form.screen).toBeVisible();
    await expect(form.submit).toBeDisabled();
    await form.office.choose(1);
    await form.firstname.fill('Ada');
    await form.lastname.fill('Lovelace');
    await form.joiningDate.fill('2026-01-05');
    await expect(form.submit).toBeEnabled();
    await form.mobile.fill('07x2');
    await expect(form.fieldError(TID.staffForm.mobile)).toContainText(/digits/i);
    await expect(form.submit).toBeDisabled();
    await form.mobile.fill('0772000000');
    await form.email.fill('ada@');
    await expect(form.fieldError(TID.staffForm.email)).toContainText(/email/i);
    await expect(form.submit).toBeDisabled();
    await form.email.fill('ada@example.org');
    await form.joiningDate.fill('2026-13-01');
    await expect(form.fieldError(TID.staffForm.joiningDate)).toContainText('YYYY-MM-DD');
    await expect(form.submit).toBeDisabled();
  });

  test('shows a server rejection under the mobile field', async ({ page }) => {
    spec('P1-ORG-002/6');
    await signInAs(page, 'staffAdmin', {
      ...organizationHandlers(),
      'POST /v1/staff': () =>
        fieldRejection('mobileNo', 'The parameter `mobileNo` exceeds max length of 50.'),
    });
    await page.goto('/organization/staff/new');
    const form = new StaffFormPage(page);
    await form.office.choose(1);
    await form.firstname.fill('Ada');
    await form.lastname.fill('Lovelace');
    await form.mobile.fill('0'.repeat(51));
    await form.joiningDate.fill('2026-01-05');
    await form.submit.click();
    await expect(form.fieldError(TID.staffForm.mobile)).toContainText('max length');
    await expect(form.firstname).toHaveValue('Ada');
  });

  test('the view shows the staff member and offers Edit only to who may edit', async ({
    page,
    checkA11y,
  }) => {
    spec('P1-ORG-002/7');
    await signInAs(page, 'staffAdmin', organizationHandlers());
    const view = new StaffMemberPage(page);
    await view.open(1);
    await expect(view.name).toHaveText('Director, Program');
    await expect(view.office).toContainText('Head Office');
    await expect(view.mobile).toContainText('0700000001');
    await expect(view.joiningDate).toContainText('2020-01-01');
    await expect(view.loanOfficer).toContainText('Yes');
    await expect(view.status).toContainText('Active');
    await expect(view.edit).toBeVisible();
    await checkA11y();

    await page.evaluate(() => sessionStorage.clear());
    await signInAs(page, 'staffReader', organizationHandlers());
    await view.open(1);
    await expect(view.name).toHaveText('Director, Program');
    await expect(view.edit).toHaveCount(0);
  });

  test('edits staff, sending only the editable fields', async ({ page }) => {
    spec('P1-ORG-002/8');
    const api = await signInAs(page, 'staffAdmin', organizationHandlers());
    const view = new StaffMemberPage(page);
    await view.open(2);
    await view.edit.click();
    await expect(page).toHaveURL(/\/organization\/staff\/2\/edit$/);
    const form = new StaffFormPage(page);
    await expect(form.firstname).toHaveValue('Grace');
    await expect(form.lastname).toHaveValue('Okello');
    await expect(form.office.trigger).toContainText('Kampala Branch');
    await expect(form.office.trigger).toHaveAttribute('aria-disabled', 'true');
    await expect(form.joiningDate).toHaveValue('2026-10-05');
    await expect(form.joiningDate).not.toBeEditable();
    await form.mobile.fill('0772000000');
    await form.active.click();
    await form.submit.click();
    await expect(page).toHaveURL(/\/organization\/staff\/2$/);
    await expect(view.status).toContainText('Active');
    await expect(view.mobile).toContainText('0772000000');
    const put = api.calls.find((c) => c.method === 'PUT' && c.path === '/v1/staff/2')!;
    expect(put.body).toEqual({
      firstname: 'Grace',
      lastname: 'Okello',
      mobileNo: '0772000000',
      isLoanOfficer: false,
      isActive: true,
    });
  });

  test('a reader is refused the edit URL', async ({ page }) => {
    spec('P1-ORG-002/9');
    await signInAs(page, 'staffReader', organizationHandlers());
    await page.goto('/organization/staff/2/edit');
    await expect(new AccessDeniedPage(page).required).toContainText('UPDATE_STAFF');
  });

  test('says there are no staff yet', async ({ page }) => {
    spec('P1-ORG-002/10');
    await signInAs(page, 'staffAdmin', organizationHandlers({ staff: [] }));
    await new StaffListPage(page).open();
    await expect(new ScreenState(page).empty).toBeVisible();
  });
});
