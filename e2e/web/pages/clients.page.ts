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

import type { Locator, Page } from '@playwright/test';

import { TID } from '../../shared/testids';
import { Select } from './organization.page';

/** The visible one: the stack keeps earlier screens mounted, hidden, on web. */
const byId = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

export class ClientsPage {
  readonly screen: Locator;
  readonly search: Locator;
  readonly create: Locator;
  readonly range: Locator;
  readonly first: Locator;
  readonly previous: Locator;
  readonly next: Locator;
  readonly last: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    const t = TID.clients;
    this.screen = byId(page, t.screen);
    this.search = byId(page, t.search);
    this.create = byId(page, t.create);
    this.range = byId(page, t.range);
    this.first = byId(page, t.first);
    this.previous = byId(page, t.previous);
    this.next = byId(page, t.next);
    this.last = byId(page, t.last);
    this.rows = page.locator('[data-testid^="clients.row."]').filter({ visible: true });
  }

  row(id: number): Locator {
    return byId(this.page, TID.clients.row(id));
  }

  async open(): Promise<void> {
    await this.page.goto('/clients');
  }
}

export class ClientPage {
  readonly screen: Locator;
  readonly name: Locator;
  readonly accountNo: Locator;
  readonly status: Locator;
  readonly office: Locator;
  readonly legalForm: Locator;
  readonly externalId: Locator;
  readonly mobile: Locator;
  readonly email: Locator;
  readonly submittedOn: Locator;
  readonly activationDate: Locator;
  readonly closedOn: Locator;
  readonly activate: Locator;
  readonly actionDate: Locator;
  readonly actionReason: Select;
  readonly actionNoReasons: Locator;
  readonly actionConfirm: Locator;
  readonly actionCancel: Locator;
  readonly actionError: Locator;
  /** Every lifecycle action button on the page. */
  readonly actions: Locator;
  readonly identifiersLink: Locator;
  readonly notesLink: Locator;
  readonly chargesLink: Locator;
  readonly familyLink: Locator;
  readonly staff: Locator;
  readonly assignStaff: Locator;
  readonly unassignStaff: Locator;
  readonly staffSelect: Select;
  readonly staffNone: Locator;
  readonly staffConfirm: Locator;
  readonly staffCancel: Locator;
  readonly unassignConfirm: Locator;
  readonly unassignCancel: Locator;
  readonly transferTo: Locator;
  readonly transferOffice: Select;
  readonly transferDate: Locator;
  readonly transferNote: Locator;
  readonly transferConfirm: Locator;
  readonly transferCancel: Locator;
  readonly transferError: Locator;

  constructor(private readonly page: Page) {
    const t = TID.client;
    this.screen = byId(page, t.screen);
    this.name = byId(page, t.name);
    this.accountNo = byId(page, t.accountNo);
    this.status = byId(page, t.status);
    this.office = byId(page, t.office);
    this.legalForm = byId(page, t.legalForm);
    this.externalId = byId(page, t.externalId);
    this.mobile = byId(page, t.mobile);
    this.email = byId(page, t.email);
    this.submittedOn = byId(page, t.submittedOn);
    this.activationDate = byId(page, t.activationDate);
    this.closedOn = byId(page, t.closedOn);
    this.activate = byId(page, t.action('activate'));
    this.actionDate = byId(page, t.actionDate);
    this.actionReason = new Select(page, t.actionReason);
    this.actionNoReasons = byId(page, t.actionNoReasons);
    this.actionConfirm = byId(page, t.actionConfirm);
    this.actionCancel = byId(page, t.actionCancel);
    this.actionError = byId(page, t.actionError);
    this.actions = page.locator('[data-testid^="client.action."]').filter({ visible: true });
    this.identifiersLink = byId(page, t.identifiersLink);
    this.notesLink = byId(page, t.notesLink);
    this.chargesLink = byId(page, t.chargesLink);
    this.familyLink = byId(page, t.familyLink);
    this.staff = byId(page, t.staff);
    this.assignStaff = byId(page, t.assignStaff);
    this.unassignStaff = byId(page, t.unassignStaff);
    this.staffSelect = new Select(page, t.staffSelect);
    this.staffNone = byId(page, t.staffNone);
    this.staffConfirm = byId(page, t.staffConfirm);
    this.staffCancel = byId(page, t.staffCancel);
    this.unassignConfirm = byId(page, t.unassignConfirm);
    this.unassignCancel = byId(page, t.unassignCancel);
    this.transferTo = byId(page, t.transferTo);
    this.transferOffice = new Select(page, t.transferOffice);
    this.transferDate = byId(page, t.transferDate);
    this.transferNote = byId(page, t.transferNote);
    this.transferConfirm = byId(page, t.transferConfirm);
    this.transferCancel = byId(page, t.transferCancel);
    this.transferError = byId(page, t.transferError);
  }

  /** The button for one transfer command: `proposeTransfer`, `acceptTransfer`, … */
  transfer(command: string): Locator {
    return byId(this.page, TID.client.transfer(command));
  }

  /** The button for one command: `activate`, `reject`, `undoRejection`, … */
  action(command: string): Locator {
    return byId(this.page, TID.client.action(command));
  }

  async open(id: number): Promise<void> {
    await this.page.goto(`/clients/${id}`);
  }
}

export class ClientFormPage {
  readonly screen: Locator;
  readonly legalForm: Select;
  readonly office: Select;
  readonly firstname: Locator;
  readonly middlename: Locator;
  readonly lastname: Locator;
  readonly fullname: Locator;
  readonly submittedOn: Locator;
  readonly active: Locator;
  readonly activationDate: Locator;
  readonly externalId: Locator;
  readonly mobile: Locator;
  readonly email: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    const t = TID.clientForm;
    this.screen = byId(page, t.screen);
    this.legalForm = new Select(page, t.legalForm);
    this.office = new Select(page, t.office);
    this.firstname = byId(page, t.firstname);
    this.middlename = byId(page, t.middlename);
    this.lastname = byId(page, t.lastname);
    this.fullname = byId(page, t.fullname);
    this.submittedOn = byId(page, t.submittedOn);
    this.active = byId(page, t.active);
    this.activationDate = byId(page, t.activationDate);
    this.externalId = byId(page, t.externalId);
    this.mobile = byId(page, t.mobile);
    this.email = byId(page, t.email);
    this.submit = byId(page, t.submit);
    this.error = byId(page, t.error);
  }

  async open(): Promise<void> {
    await this.page.goto('/clients/new');
  }

  fieldError(field: string): Locator {
    return byId(this.page, TID.fieldError(field));
  }
}
