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

export class AboutPage {
  readonly screen: Locator;
  readonly disclaimer: Locator;
  readonly version: Locator;
  readonly license: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(TID.about.screen);
    this.disclaimer = page.getByTestId(TID.about.disclaimer);
    this.version = page.getByTestId(TID.about.version);
    this.license = page.getByTestId(TID.about.license);
  }

  async open(): Promise<void> {
    await this.page.goto('/about');
  }
}
