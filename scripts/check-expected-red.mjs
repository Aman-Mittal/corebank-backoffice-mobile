#!/usr/bin/env node
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

/**
 * The e2e-first ratchet.
 *
 * Specs are written before the code they test, and committed red. That only works if "red on
 * purpose" stays an explicit, shrinking list rather than a growing pile of skips. This checks:
 *
 *   1. Every entry in e2e/shared/expected-red.json names a parity row or a documented scenario
 *      (optionally `@web` / `@native`) and is referenced on that platform.
 *   2. A Maestro flow carries the `pending` tag exactly when its scenario is red on native.
 *   3. Every parity row of a phase at or below the current phase has at least one web spec.
 *   4. Against BASE_REF (default origin/main; skipped when absent), the list only shrinks —
 *      unless E2E_SPEC_FIRST=1 (the `e2e-spec-first` label) and the PR changes nothing in src/.
 *      Narrowing `ID` to `ID@native` counts as shrinking.
 */
import { execFileSync } from 'node:child_process';

import {
  ROOT,
  documentedScenarios,
  expectedRed,
  flowScenarios,
  isRed,
  parityRows,
  read,
  rowOf,
  stripPlatform,
  webScenarios,
} from './lib/e2e-refs.mjs';

const CURRENT_PHASE = Number(
  process.env.CURRENT_PHASE ?? JSON.parse(read('e2e/shared/phase.json')).current,
);

const red = expectedRed();
const rows = parityRows();
const rowIds = new Set(rows.map((r) => r.id));
const documented = documentedScenarios();
const web = webScenarios();
const flows = flowScenarios();
const webRows = new Set([...web.keys()].map(rowOf));
const flowRows = new Set([...flows.keys()].map(rowOf));
const problems = [];

for (const entry of red) {
  const id = stripPlatform(entry);
  const isScenario = id.includes('/');
  if (isScenario ? !documented.has(id) : !rowIds.has(id)) {
    problems.push(`${entry}: not a ${isScenario ? 'documented scenario' : 'parity-matrix row'}`);
    continue;
  }
  const onWeb = isScenario ? web.has(id) : webRows.has(id);
  const onNative = isScenario ? flows.has(id) : flowRows.has(id);
  const referenced = entry.endsWith('@web')
    ? onWeb
    : entry.endsWith('@native')
      ? onNative
      : onWeb || onNative;
  if (!referenced)
    problems.push(`${entry}: listed as expected-red but nothing on that platform implements it`);
}

for (const [scenario, refs] of flows) {
  for (const { file, pending } of refs) {
    const r = isRed(red, scenario, 'native');
    if (r && !pending)
      problems.push(`${file}: ${scenario} is red on native, so the flow must be tagged pending`);
    if (!r && pending)
      problems.push(`${file}: ${scenario} is not red on native; remove its pending tag`);
  }
}

for (const row of rows) {
  if (row.phase <= CURRENT_PHASE && row.platforms.includes('web') && !webRows.has(row.id)) {
    problems.push(`${row.id} (phase ${row.phase}, "${row.title}") has no web spec yet`);
  }
}

const baseRef = process.env.BASE_REF ?? 'origin/main';
const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
let base = null;
try {
  base = new Set(JSON.parse(git('show', `${baseRef}:e2e/shared/expected-red.json`)).ids);
} catch {
  console.log(`(ratchet skipped: ${baseRef} has no expected-red.json)`);
}
if (base) {
  const covers = (entry) => {
    const id = stripPlatform(entry);
    return (
      base.has(entry) ||
      base.has(id) ||
      base.has(rowOf(id)) ||
      base.has(`${rowOf(id)}${entry.slice(id.length)}`)
    );
  };
  const added = [...red].filter((e) => !covers(e));
  if (added.length > 0) {
    if (process.env.E2E_SPEC_FIRST !== '1') {
      problems.push(
        `expected-red may only shrink; added ${added.join(', ')}. Use an e2e-spec-first PR.`,
      );
    } else {
      const changed = git('diff', '--name-only', `${baseRef}...HEAD`).split('\n').filter(Boolean);
      const src = changed.filter((f) => f.startsWith('src/'));
      if (src.length > 0)
        problems.push(`an e2e-spec-first PR may not change src/: ${src.join(', ')}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`✗ e2e-first ratchet:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `✓ e2e-first ratchet: phase ${CURRENT_PHASE}, ${red.size} expected-red entr${red.size === 1 ? 'y' : 'ies'}, ` +
    `${web.size} web and ${flows.size} native scenario(s) implemented.`,
);
