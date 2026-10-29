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

export class ProfilePage {
  readonly screen: Locator;
  readonly username: Locator;
  readonly displayName: Locator;
  readonly office: Locator;
  readonly email: Locator;
  readonly roles: Locator;
  readonly changePassword: Locator;
  readonly newPassword: Locator;
  readonly repeatPassword: Locator;
  readonly mismatch: Locator;
  readonly policy: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly error: Locator;
  readonly notice: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(TID.profile.screen);
    this.username = page.getByTestId(TID.profile.username);
    this.displayName = page.getByTestId(TID.profile.displayName);
    this.office = page.getByTestId(TID.profile.office);
    this.email = page.getByTestId(TID.profile.email);
    this.roles = page.getByTestId(TID.profile.roles);
    this.changePassword = page.getByTestId(TID.profile.changePassword);
    this.newPassword = page.getByTestId(TID.profile.newPassword);
    this.repeatPassword = page.getByTestId(TID.profile.repeatPassword);
    this.mismatch = page.getByTestId(TID.profile.mismatch);
    this.policy = page.getByTestId(TID.profile.policy);
    this.submit = page.getByTestId(TID.profile.submit);
    this.cancel = page.getByTestId(TID.profile.cancel);
    this.error = page.getByTestId(TID.profile.error);
    this.notice = page.getByTestId(TID.profile.notice);
  }

  async open(): Promise<void> {
    await this.page.goto('/profile');
  }
}
