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
 * Keeps DOCS/test-plan and the e2e suites in step (DOCS/test-plan/README.md):
 *
 *   - a documented scenario that is not `planned` is implemented at every level it lists
 *     (web / web-backend by a Playwright spec, native / native-backend by a Maestro flow);
 *   - a `planned` scenario is not implemented yet (or its status is out of date);
 *   - every scenario a spec or flow names is documented;
 *   - `green` scenarios are not expected-red on any platform, and `red` ones are red somewhere.
 */
import {
  documentedScenarios,
  expectedRed,
  flowScenarios,
  isRed,
  parityRows,
  rowOf,
  webScenarios,
} from './lib/e2e-refs.mjs';

const LEVELS = new Set(['web', 'web-backend', 'native', 'native-backend']);
const STATUSES = new Set(['planned', 'red', 'green']);

const docs = documentedScenarios();
const web = webScenarios();
const flows = flowScenarios();
const red = expectedRed();
const rowIds = new Set(parityRows().map((r) => r.id));
const problems = [];

for (const [id, s] of docs) {
  const where = `${s.file}: ${id}`;
  if (!rowIds.has(rowOf(id))) problems.push(`${where} belongs to no parity-matrix row`);
  if (!STATUSES.has(s.status)) problems.push(`${where} has status "${s.status}"`);
  for (const level of s.levels)
    if (!LEVELS.has(level)) problems.push(`${where} has unknown level "${level}"`);
  const needsWeb = s.levels.some((l) => l.startsWith('web'));
  const needsNative = s.levels.some((l) => l.startsWith('native'));
  if (s.status === 'planned') {
    if (web.has(id) || flows.has(id))
      problems.push(`${where} is implemented; its status is no longer "planned"`);
    continue;
  }
  if (needsWeb && !web.has(id))
    problems.push(`${where} lists a web level but no Playwright spec names it`);
  if (needsNative && !flows.has(id))
    problems.push(`${where} lists a native level but no Maestro flow names it`);
  if (!needsWeb && web.has(id)) problems.push(`${where} has a web spec but lists no web level`);
  if (!needsNative && flows.has(id))
    problems.push(`${where} has a Maestro flow but lists no native level`);
  const redSomewhere = isRed(red, id, 'web') || isRed(red, id, 'native');
  if (s.status === 'green' && redSomewhere)
    problems.push(`${where} is "green" but still expected-red`);
  if (s.status === 'red' && !redSomewhere)
    problems.push(`${where} is "red" but not in expected-red.json — mark it green`);
}

for (const id of new Set([...web.keys(), ...flows.keys()])) {
  if (!docs.has(id))
    problems.push(
      `${id} is implemented by ${web.get(id)?.[0] ?? flows.get(id)?.[0]?.file} but not documented in DOCS/test-plan`,
    );
}

if (problems.length > 0) {
  console.error(`✗ test plan:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const count = (st) => [...docs.values()].filter((s) => s.status === st).length;
console.log(
  `✓ test plan: ${docs.size} documented scenarios (${count('green')} green, ${count('red')} red, ${count('planned')} planned), all implemented scenarios documented.`,
);
