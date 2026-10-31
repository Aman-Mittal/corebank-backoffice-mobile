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

export class FamilyPage {
  readonly screen: Locator;
  readonly add: Locator;
  readonly rows: Locator;
  readonly confirmRemove: Locator;
  readonly cancelRemove: Locator;
  readonly firstName: Locator;
  readonly middleName: Locator;
  readonly lastName: Locator;
  readonly relationship: Select;
  readonly noRelationships: Locator;
  readonly gender: Select;
  readonly mobile: Locator;
  readonly age: Locator;
  readonly dateOfBirth: Locator;
  readonly dependent: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    const t = TID.family;
    const f = TID.familyForm;
    this.screen = byId(page, t.screen);
    this.add = byId(page, t.add);
    this.rows = page.locator('[data-testid^="family.row."]').filter({ visible: true });
    this.confirmRemove = byId(page, t.confirmRemove);
    this.cancelRemove = byId(page, t.cancelRemove);
    this.firstName = byId(page, f.firstName);
    this.middleName = byId(page, f.middleName);
    this.lastName = byId(page, f.lastName);
    this.relationship = new Select(page, f.relationship);
    this.noRelationships = byId(page, f.noRelationships);
    this.gender = new Select(page, f.gender);
    this.mobile = byId(page, f.mobile);
    this.age = byId(page, f.age);
    this.dateOfBirth = byId(page, f.dateOfBirth);
    this.dependent = byId(page, f.dependent);
    this.submit = byId(page, f.submit);
  }

  row(id: number): Locator {
    return byId(this.page, TID.family.row(id));
  }

  edit(id: number): Locator {
    return byId(this.page, TID.family.edit(id));
  }

  remove(id: number): Locator {
    return byId(this.page, TID.family.remove(id));
  }

  async open(clientId: number): Promise<void> {
    await this.page.goto(`/clients/${clientId}/family`);
  }
}
