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

export class Shell {
  readonly menuButton: Locator;
  readonly drawer: Locator;
  readonly drawerClose: Locator;
  readonly backdrop: Locator;
  readonly sidebar: Locator;
  readonly signOut: Locator;

  constructor(private readonly page: Page) {
    this.menuButton = page.getByTestId(TID.shell.menuButton);
    this.drawer = page.getByTestId(TID.shell.drawer);
    this.drawerClose = page.getByTestId(TID.shell.drawerClose);
    this.backdrop = page.getByTestId(TID.shell.backdrop);
    this.sidebar = page.getByTestId(TID.shell.sidebar);
    this.signOut = page.getByTestId(TID.shell.signOut);
  }

  /** A navigation entry, wherever the navigation is currently shown (sidebar or drawer). */
  navItem(id: string): Locator {
    return this.page.getByTestId(TID.shell.navItem(id)).filter({ visible: true });
  }

  /** Opens a group, if collapsed, and returns the entry. */
  async openNavItem(groupId: string | null, id: string): Promise<Locator> {
    if (groupId) {
      const group = this.page.getByTestId(TID.shell.navGroup(groupId)).filter({ visible: true });
      if ((await group.getAttribute('aria-expanded')) !== 'true') await group.click();
    }
    return this.navItem(id);
  }
}

export class AccessDeniedPage {
  readonly screen: Locator;
  readonly heading: Locator;
  readonly required: Locator;
  readonly home: Locator;

  constructor(page: Page) {
    this.screen = page.getByTestId(TID.accessDenied.screen);
    this.heading = page.getByTestId(TID.accessDenied.heading);
    this.required = page.getByTestId(TID.accessDenied.required);
    this.home = page.getByTestId(TID.accessDenied.home);
  }
}

export class PlaceholderPage {
  readonly screen: Locator;
  readonly title: Locator;
  readonly phase: Locator;

  constructor(page: Page) {
    this.screen = page.getByTestId(TID.placeholder.screen);
    this.title = page.getByTestId(TID.placeholder.title);
    this.phase = page.getByTestId(TID.placeholder.phase);
  }
}
