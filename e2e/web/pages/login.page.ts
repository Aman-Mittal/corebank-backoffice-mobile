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

export class LoginPage {
  readonly screen: Locator;
  readonly server: Locator;
  readonly tenant: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;
  readonly notice: Locator;
  readonly aboutLink: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(TID.login.screen);
    this.server = page.getByTestId(TID.login.server);
    this.tenant = page.getByTestId(TID.login.tenant);
    this.username = page.getByTestId(TID.login.username);
    this.password = page.getByTestId(TID.login.password);
    this.submit = page.getByTestId(TID.login.submit);
    this.error = page.getByTestId(TID.login.error);
    this.notice = page.getByTestId(TID.login.notice);
    this.aboutLink = page.getByTestId(TID.login.aboutLink);
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/login${query}`);
  }

  async signIn(username = 'mifos', password = 'password'): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }
}
