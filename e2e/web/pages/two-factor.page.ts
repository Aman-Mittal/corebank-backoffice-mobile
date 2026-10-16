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

export class TwoFactorStep {
  readonly screen: Locator;
  readonly target: Locator;
  readonly send: Locator;
  readonly code: Locator;
  readonly verify: Locator;
  readonly error: Locator;
  readonly noMethods: Locator;
  readonly back: Locator;

  constructor(private readonly page: Page) {
    this.screen = page.getByTestId(TID.twoFactor.screen);
    this.target = page.getByTestId(TID.twoFactor.target);
    this.send = page.getByTestId(TID.twoFactor.send);
    this.code = page.getByTestId(TID.twoFactor.code);
    this.verify = page.getByTestId(TID.twoFactor.verify);
    this.error = page.getByTestId(TID.twoFactor.error);
    this.noMethods = page.getByTestId(TID.twoFactor.noMethods);
    this.back = page.getByTestId(TID.twoFactor.back);
  }

  method(name: string): Locator {
    return this.page.getByTestId(TID.twoFactor.method(name));
  }

  async enter(code: string): Promise<void> {
    await this.code.fill(code);
    await this.verify.click();
  }
}
