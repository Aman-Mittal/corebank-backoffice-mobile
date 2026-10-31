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

/** The visible one: the stack keeps earlier screens mounted, hidden, on web. */
const byId = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

export class SearchPage {
  readonly screen: Locator;
  readonly query: Locator;
  readonly hint: Locator;
  readonly empty: Locator;
  readonly failed: Locator;

  constructor(private readonly page: Page) {
    const t = TID.search;
    this.screen = byId(page, t.screen);
    this.query = byId(page, t.query);
    this.hint = byId(page, t.hint);
    this.empty = byId(page, t.empty);
    this.failed = byId(page, t.failed);
  }

  shortcut(id: string): Locator {
    return byId(this.page, TID.search.shortcut(id));
  }

  result(type: string, id: number): Locator {
    return byId(this.page, TID.search.result(type, id));
  }

  async open(): Promise<void> {
    await this.page.goto('/search');
  }
}

export class Breadcrumbs {
  readonly trail: Locator;
  readonly current: Locator;

  constructor(private readonly page: Page) {
    this.trail = byId(page, TID.breadcrumb.trail);
    this.current = byId(page, TID.breadcrumb.current);
  }

  crumb(id: string): Locator {
    return byId(this.page, TID.breadcrumb.crumb(id));
  }
}
