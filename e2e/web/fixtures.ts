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

import { AxeBuilder } from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

export { TID } from '../shared/testids';
export { spec } from './pending';

/**
 * The shared test fixture. `checkA11y()` runs axe against the current page and fails on any
 * WCAG 2.1 A/AA violation; every spec on the mocked project calls it on each screen it visits.
 */
export const test = base.extend<{ checkA11y: (page?: Page) => Promise<void> }>({
  checkA11y: async ({ page }, use) => {
    await use(async (target = page) => {
      const results = await new AxeBuilder({ page: target })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  },
});

export { expect };
