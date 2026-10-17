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
  readonly previous: Locator;
  readonly next: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    const t = TID.clients;
    this.screen = byId(page, t.screen);
    this.search = byId(page, t.search);
    this.create = byId(page, t.create);
    this.range = byId(page, t.range);
    this.previous = byId(page, t.previous);
    this.next = byId(page, t.next);
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
  readonly activate: Locator;
  readonly activateDate: Locator;
  readonly activateConfirm: Locator;

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
    this.activate = byId(page, t.activate);
    this.activateDate = byId(page, t.activateDate);
    this.activateConfirm = byId(page, t.activateConfirm);
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
