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

export class ChargesPage {
  readonly screen: Locator;
  readonly back: Locator;
  readonly add: Locator;
  readonly rows: Locator;
  readonly payAmount: Locator;
  readonly payDate: Locator;
  readonly paySubmit: Locator;
  readonly payCancel: Locator;
  readonly confirmWaive: Locator;
  readonly confirmRemove: Locator;
  readonly cancelConfirm: Locator;
  readonly rowError: Locator;
  readonly charge: Select;
  readonly amount: Locator;
  readonly dueDate: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly formError: Locator;

  constructor(private readonly page: Page) {
    const t = TID.charges;
    const f = TID.chargeForm;
    this.screen = byId(page, t.screen);
    this.back = byId(page, t.back);
    this.add = byId(page, t.add);
    this.rows = page.locator('[data-testid^="charges.row."]').filter({ visible: true });
    this.payAmount = byId(page, t.payAmount);
    this.payDate = byId(page, t.payDate);
    this.paySubmit = byId(page, t.paySubmit);
    this.payCancel = byId(page, t.payCancel);
    this.confirmWaive = byId(page, t.confirmWaive);
    this.confirmRemove = byId(page, t.confirmRemove);
    this.cancelConfirm = byId(page, t.cancelConfirm);
    this.rowError = byId(page, t.rowError);
    this.charge = new Select(page, f.charge);
    this.amount = byId(page, f.amount);
    this.dueDate = byId(page, f.dueDate);
    this.submit = byId(page, f.submit);
    this.cancel = byId(page, f.cancel);
    this.formError = byId(page, f.error);
  }

  row(id: number): Locator {
    return byId(this.page, TID.charges.row(id));
  }

  status(id: number): Locator {
    return byId(this.page, TID.charges.status(id));
  }

  pay(id: number): Locator {
    return byId(this.page, TID.charges.pay(id));
  }

  waive(id: number): Locator {
    return byId(this.page, TID.charges.waive(id));
  }

  remove(id: number): Locator {
    return byId(this.page, TID.charges.remove(id));
  }

  fieldError(field: string): Locator {
    return byId(this.page, TID.fieldError(field));
  }

  async open(clientId: number): Promise<void> {
    await this.page.goto(`/clients/${clientId}/charges`);
  }
}
