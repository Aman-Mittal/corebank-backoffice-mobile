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

export class IdentifiersPage {
  readonly screen: Locator;
  readonly back: Locator;
  readonly add: Locator;
  readonly rows: Locator;
  readonly confirmRemove: Locator;
  readonly cancelRemove: Locator;
  readonly type: Select;
  readonly key: Locator;
  readonly description: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    const t = TID.identifiers;
    const f = TID.identifierForm;
    this.screen = byId(page, t.screen);
    this.back = byId(page, t.back);
    this.add = byId(page, t.add);
    this.rows = page.locator('[data-testid^="identifiers.row."]').filter({ visible: true });
    this.confirmRemove = byId(page, t.confirmRemove);
    this.cancelRemove = byId(page, t.cancelRemove);
    this.type = new Select(page, f.type);
    this.key = byId(page, f.key);
    this.description = byId(page, f.description);
    this.submit = byId(page, f.submit);
    this.cancel = byId(page, f.cancel);
    this.error = byId(page, f.error);
  }

  row(id: number): Locator {
    return byId(this.page, TID.identifiers.row(id));
  }

  remove(id: number): Locator {
    return byId(this.page, TID.identifiers.remove(id));
  }

  fieldError(field: string): Locator {
    return byId(this.page, TID.fieldError(field));
  }

  async open(clientId: number): Promise<void> {
    await this.page.goto(`/clients/${clientId}/identifiers`);
  }
}

export class NotesPage {
  readonly screen: Locator;
  readonly back: Locator;
  readonly text: Locator;
  readonly add: Locator;
  readonly error: Locator;
  readonly rows: Locator;
  readonly editText: Locator;
  readonly save: Locator;
  readonly cancelEdit: Locator;
  readonly confirmRemove: Locator;
  readonly cancelRemove: Locator;

  constructor(private readonly page: Page) {
    const t = TID.notes;
    this.screen = byId(page, t.screen);
    this.back = byId(page, t.back);
    this.text = byId(page, t.text);
    this.add = byId(page, t.add);
    this.error = byId(page, t.error);
    this.rows = page.locator('[data-testid^="notes.row."]').filter({ visible: true });
    this.editText = byId(page, t.editText);
    this.save = byId(page, t.save);
    this.cancelEdit = byId(page, t.cancelEdit);
    this.confirmRemove = byId(page, t.confirmRemove);
    this.cancelRemove = byId(page, t.cancelRemove);
  }

  row(id: number): Locator {
    return byId(this.page, TID.notes.row(id));
  }

  edit(id: number): Locator {
    return byId(this.page, TID.notes.edit(id));
  }

  remove(id: number): Locator {
    return byId(this.page, TID.notes.remove(id));
  }

  async open(clientId: number): Promise<void> {
    await this.page.goto(`/clients/${clientId}/notes`);
  }
}
