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

import { test } from '@playwright/test';

import expectedRed from '../shared/expected-red.json' with { type: 'json' };

const RED = new Set<string>(expectedRed.ids);

/** Projects cheap enough to run red specs on every PR, where an unexpected pass must fail CI. */
const RUN_RED_ON = new Set(['mocked', 'mobile']);

/**
 * Declares the documented scenario a test implements (DOCS/test-plan), and whether it is still
 * expected to fail. Call it first in every test: `spec('P1-SHELL-027/2')`.
 *
 * An `expected-red.json` entry names a scenario (`P1-SHELL-027/2`) or a whole parity row
 * (`P1-SHELL-027`), optionally for one platform (`…@web`, `…@native`).
 *
 * - Not red: a normal test, which must pass.
 * - Red, on `mocked`/`mobile`: `test.fail()`. It runs and must fail; if it starts passing,
 *   Playwright reports it, which is the prompt to remove the entry.
 * - Red, on `backend`/`two-factor`: `test.fixme()`. The nightly probe (`PENDING_PROBE=1`) runs
 *   them as `test.fail()` instead.
 */
export function spec(scenario: string): void {
  const row = scenario.split('/', 1)[0]!;
  test.info().annotations.push({ type: 'scenario', description: scenario });
  const red = [scenario, `${scenario}@web`, row, `${row}@web`].some((e) => RED.has(e));
  if (!red) return;
  const project = test.info().project.name;
  if (RUN_RED_ON.has(project) || process.env.PENDING_PROBE === '1') {
    test.fail(
      true,
      `${scenario} is expected red (e2e-first); remove it from expected-red.json once green`,
    );
  } else {
    test.fixme(true, `${scenario} is expected red (e2e-first); runs in the nightly pending probe`);
  }
}
