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

/**
 * The stack keeps earlier screens mounted, hidden, on web: after following a parent link there
 * are two office pages in the DOM. A page object means the one on screen.
 */
const byId = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

/** A select field: its trigger, and the option for a value. */
export class Select {
  constructor(
    private readonly page: Page,
    readonly id: string,
  ) {}

  get trigger(): Locator {
    return byId(this.page, this.id);
  }

  async choose(value: number | string): Promise<void> {
    await this.trigger.click();
    await byId(this.page, TID.option(this.id, value)).click();
  }
}

export class OfficesPage {
  readonly screen: Locator;
  readonly search: Locator;
  readonly create: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.screen = byId(page, TID.offices.screen);
    this.search = byId(page, TID.offices.search);
    this.create = byId(page, TID.offices.create);
    this.rows = page.locator('[data-testid^="offices.row."]').filter({ visible: true });
  }

  row(id: number): Locator {
    return byId(this.page, TID.offices.row(id));
  }

  async open(): Promise<void> {
    await this.page.goto('/organization/offices');
  }
}

export class OfficePage {
  readonly screen: Locator;
  readonly name: Locator;
  readonly parent: Locator;
  readonly openingDate: Locator;
  readonly externalId: Locator;
  readonly edit: Locator;

  constructor(private readonly page: Page) {
    this.screen = byId(page, TID.office.screen);
    this.name = byId(page, TID.office.name);
    this.parent = byId(page, TID.office.parent);
    this.openingDate = byId(page, TID.office.openingDate);
    this.externalId = byId(page, TID.office.externalId);
    this.edit = byId(page, TID.office.edit);
  }

  async open(id: number): Promise<void> {
    await this.page.goto(`/organization/offices/${id}`);
  }
}

export class OfficeFormPage {
  readonly screen: Locator;
  readonly name: Locator;
  readonly parent: Select;
  readonly openingDate: Locator;
  readonly externalId: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.screen = byId(page, TID.officeForm.screen);
    this.name = byId(page, TID.officeForm.name);
    this.parent = new Select(page, TID.officeForm.parent);
    this.openingDate = byId(page, TID.officeForm.openingDate);
    this.externalId = byId(page, TID.officeForm.externalId);
    this.submit = byId(page, TID.officeForm.submit);
    this.error = byId(page, TID.officeForm.error);
  }

  fieldError(field: string): Locator {
    return byId(this.page, TID.fieldError(field));
  }
}

export class StaffListPage {
  readonly screen: Locator;
  readonly search: Locator;
  readonly officeFilter: Select;
  readonly create: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.screen = byId(page, TID.staff.screen);
    this.search = byId(page, TID.staff.search);
    this.officeFilter = new Select(page, TID.staff.officeFilter);
    this.create = byId(page, TID.staff.create);
    this.rows = page.locator('[data-testid^="staff.row."]').filter({ visible: true });
  }

  row(id: number): Locator {
    return byId(this.page, TID.staff.row(id));
  }

  async open(): Promise<void> {
    await this.page.goto('/organization/staff');
  }
}

export class StaffMemberPage {
  readonly screen: Locator;
  readonly name: Locator;
  readonly office: Locator;
  readonly mobile: Locator;
  readonly email: Locator;
  readonly externalId: Locator;
  readonly joiningDate: Locator;
  readonly loanOfficer: Locator;
  readonly status: Locator;
  readonly edit: Locator;

  constructor(private readonly page: Page) {
    const t = TID.staffMember;
    this.screen = byId(page, t.screen);
    this.name = byId(page, t.name);
    this.office = byId(page, t.office);
    this.mobile = byId(page, t.mobile);
    this.email = byId(page, t.email);
    this.externalId = byId(page, t.externalId);
    this.joiningDate = byId(page, t.joiningDate);
    this.loanOfficer = byId(page, t.loanOfficer);
    this.status = byId(page, t.status);
    this.edit = byId(page, t.edit);
  }

  async open(id: number): Promise<void> {
    await this.page.goto(`/organization/staff/${id}`);
  }
}

export class StaffFormPage {
  readonly screen: Locator;
  readonly office: Select;
  readonly firstname: Locator;
  readonly lastname: Locator;
  readonly mobile: Locator;
  readonly email: Locator;
  readonly externalId: Locator;
  readonly joiningDate: Locator;
  readonly loanOfficer: Locator;
  readonly active: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    const t = TID.staffForm;
    this.screen = byId(page, t.screen);
    this.office = new Select(page, t.office);
    this.firstname = byId(page, t.firstname);
    this.lastname = byId(page, t.lastname);
    this.mobile = byId(page, t.mobile);
    this.email = byId(page, t.email);
    this.externalId = byId(page, t.externalId);
    this.joiningDate = byId(page, t.joiningDate);
    this.loanOfficer = byId(page, t.loanOfficer);
    this.active = byId(page, t.active);
    this.submit = byId(page, t.submit);
    this.error = byId(page, t.error);
  }

  fieldError(field: string): Locator {
    return byId(this.page, TID.fieldError(field));
  }
}

/** The shared loading / failure / empty states. */
export class ScreenState {
  readonly error: Locator;
  readonly retry: Locator;
  readonly empty: Locator;
  readonly notFound: Locator;
  readonly back: Locator;

  constructor(page: Page) {
    this.error = byId(page, TID.state.error);
    this.retry = byId(page, TID.state.retry);
    this.empty = byId(page, TID.state.empty);
    this.notFound = byId(page, TID.state.notFound);
    this.back = byId(page, TID.state.back);
  }
}
