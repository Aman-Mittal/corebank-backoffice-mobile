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

import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/** Workflow-command escaping: `%`, CR and LF would end or corrupt the annotation. */
function escape(text: string): string {
  return text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

/**
 * The nightly pending probe's account of why each expected-red spec is still red. Playwright
 * counts an expected failure as a pass and reports nothing about it, so without this the probe
 * says *that* a spec is red but never *why*. Each one becomes a check annotation, readable
 * without access to the job logs.
 */
export default class RedReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    if (test.expectedStatus !== 'failed' || result.status !== 'failed') return;
    const scenario = test.annotations.find((a) => a.type === 'scenario')?.description ?? test.title;
    const why = (result.error?.message ?? 'no error message')
      // Terminal colours are noise in an annotation.
      // eslint-disable-next-line no-control-regex
      .replaceAll(/\u001B\[[0-9;]*m/g, '')
      .slice(0, 4000);
    console.log(`::notice title=Still red: ${scenario}::${escape(`${test.title}\n${why}`)}`);
  }

  printsToStdio(): boolean {
    return true;
  }
}
