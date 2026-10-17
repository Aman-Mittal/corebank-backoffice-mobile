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

import {
  addPassport,
  clientCommand,
  createPersonClient,
  ensureCodeValue,
} from '../../../shared/factories/clients';
import { createLoanOfficer } from '../../../shared/factories/staff';
import { runId } from '../../../shared/fineract-api';
import { TID } from '../../../shared/testids';
import { expect, spec, test } from '../../fixtures';
import { ClientPage } from '../../pages/clients.page';
import { IdentifiersPage, NotesPage } from '../../pages/kyc.page';
import { LoginPage } from '../../pages/login.page';

/**
 * The servicing scenarios whose mocked versions assert what the app sends; here the real server
 * decides, so these check that the app's requests are ones it accepts and that its refusals read
 * well.
 */
test.describe('client servicing against the backend', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn();
    await page.waitForURL(/\/home$/);
  });

  test('a command the status no longer allows is refused with the server reason', async ({
    page,
    request,
  }) => {
    spec('P1-CLIENTS-012/4');
    await ensureCodeValue(request, 'ClientRejectReason', 'E2E rejection reason');
    const { clientId } = await createPersonClient(request, { active: false });
    const view = new ClientPage(page);
    await view.open(clientId);
    await expect(view.status).toContainText('Pending');
    await clientCommand(request, clientId, 'activate', { activationDate: '2026-01-05' });
    await view.action('reject').click();
    await view.actionReason.trigger.click();
    await page.getByText('E2E rejection reason').filter({ visible: true }).click();
    await view.actionConfirm.click();
    await expect(view.actionError).toBeVisible();
    await expect(view.actionError).not.toHaveText('');
    await expect(view.status).toContainText('Active');
    await expect(view.action('close')).toBeVisible();
  });

  test('a rejection is undone', async ({ page, request }) => {
    spec('P1-CLIENTS-015/2');
    const reason = await ensureCodeValue(request, 'ClientRejectReason', 'E2E rejection reason');
    const { clientId } = await createPersonClient(request, { active: false });
    await clientCommand(request, clientId, 'reject', {
      rejectionDate: '2026-01-06',
      rejectionReasonId: reason,
    });
    const view = new ClientPage(page);
    await view.open(clientId);
    await expect(view.status).toContainText('Rejected');
    await view.action('undoRejection').click();
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Pending');
    await expect(view.action('activate')).toBeVisible();
  });

  test('a pending client is withdrawn with a reason, then reopened', async ({ page, request }) => {
    spec('P1-CLIENTS-016/3');
    await ensureCodeValue(request, 'ClientWithdrawReason', 'E2E withdrawal reason');
    const { clientId } = await createPersonClient(request, { active: false });
    const view = new ClientPage(page);
    await view.open(clientId);
    await view.action('withdraw').click();
    await view.actionReason.trigger.click();
    await page.getByText('E2E withdrawal reason').filter({ visible: true }).click();
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Withdrawn');
    await view.action('undoWithdrawal').click();
    await view.actionConfirm.click();
    await expect(view.status).toContainText('Pending');
  });

  test('a loan officer is unassigned', async ({ page, request }) => {
    spec('P1-CLIENTS-007/7');
    const officer = await createLoanOfficer(request);
    const { clientId } = await createPersonClient(request, { active: true });
    await clientCommand(request, clientId, 'assignStaff', { staffId: officer.staffId });
    const view = new ClientPage(page);
    await view.open(clientId);
    await expect(view.staff).toContainText(officer.displayName);
    await view.unassignStaff.click();
    await view.unassignConfirm.click();
    await expect(view.staff).toHaveCount(0);
    await expect(view.unassignStaff).toHaveCount(0);
  });

  test('a duplicate identifier is refused under its key', async ({ page, request }) => {
    spec('P1-CLIENTS-020/11');
    const key = `P-${runId()}`;
    const first = await createPersonClient(request, { active: true });
    await addPassport(request, first.clientId, key);
    const { clientId } = await createPersonClient(request, { active: true });
    const ids = new IdentifiersPage(page);
    await ids.open(clientId);
    await ids.add.click();
    await ids.type.trigger.click();
    await page.getByText('Passport', { exact: true }).filter({ visible: true }).click();
    await ids.key.fill(key);
    await ids.submit.click();
    await expect(ids.fieldError(TID.identifierForm.key)).not.toHaveText('');
    await expect(ids.key).toHaveValue(key);
  });

  test('an identifier is deleted, and a note edited and deleted', async ({ page, request }) => {
    spec('P1-CLIENTS-020/12');
    const { clientId } = await createPersonClient(request, { active: true });
    const identifierId = await addPassport(request, clientId, `P-${runId()}`);
    const ids = new IdentifiersPage(page);
    await ids.open(clientId);
    await ids.remove(identifierId).click();
    await ids.confirmRemove.click();
    await expect(ids.row(identifierId)).toHaveCount(0);

    const notes = new NotesPage(page);
    await notes.open(clientId);
    await notes.text.fill('Met at the branch');
    await notes.add.click();
    await expect(notes.rows).toHaveCount(1);
    const testId = await notes.rows.first().getAttribute('data-testid');
    const noteId = Number(testId!.split('.').pop());
    await notes.edit(noteId).click();
    await notes.editText.fill('Met at home');
    await notes.save.click();
    // The edit box is a text area, whose text is what was typed: wait for it to close.
    await expect(notes.editText).toHaveCount(0);
    await expect(notes.row(noteId)).toContainText('Met at home');
    await notes.open(clientId);
    await expect(notes.row(noteId)).toContainText('Met at home');
    await notes.remove(noteId).click();
    await notes.confirmRemove.click();
    await expect(notes.rows).toHaveCount(0);
  });
});
