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
 * Shared readers for the e2e bookkeeping: which documented scenarios exist, which specs and
 * flows implement which scenario, and which are expected red. Used by check-expected-red.mjs
 * and check-test-plan.mjs so the two cannot disagree about what a reference is.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export const walk = (dir) =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = join(dir, name);
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });

/** `P1-SHELL-027/2` → `P1-SHELL-027`. */
export const rowOf = (scenario) => scenario.split('/')[0];

/** `P1-SHELL-027/2@native` → `P1-SHELL-027/2`. */
export const stripPlatform = (entry) => entry.replace(/@(web|native)$/, '');

const SCENARIO = /['"`]((P\d+-[A-Z]+-\d{3})\/\d+)['"`]/g;

/** Web specs: every quoted scenario literal in a spec file → the files that name it. */
export function webScenarios() {
  const refs = new Map();
  for (const file of walk('e2e/web/specs').filter((f) => f.endsWith('.spec.ts'))) {
    for (const m of read(file).matchAll(SCENARIO))
      refs.set(m[1], [...(refs.get(m[1]) ?? []), file]);
  }
  return refs;
}

/** Maestro flows: `# scenario: ID/n` → [{ file, pending }]. */
export function flowScenarios() {
  const refs = new Map();
  for (const file of walk('e2e/native/flows').filter((f) => /\.ya?ml$/.test(f))) {
    const text = read(file);
    const pending = /^\s*-\s*pending\s*$/m.test(text);
    for (const m of text.matchAll(/^#\s*scenario:\s*(P\d+-[A-Z]+-\d{3}\/\d+)\s*$/gm)) {
      refs.set(m[1], [...(refs.get(m[1]) ?? []), { file, pending }]);
    }
  }
  return refs;
}

export const expectedRed = () => new Set(JSON.parse(read('e2e/shared/expected-red.json')).ids);

/** Whether a scenario is expected red on a platform, by scenario or whole-row entry. */
export function isRed(red, scenario, platform) {
  const row = rowOf(scenario);
  return [scenario, `${scenario}@${platform}`, row, `${row}@${platform}`].some((e) => red.has(e));
}

/** Documented scenarios from DOCS/test-plan/*.md table rows: | ID | text | levels | status |. */
export function documentedScenarios() {
  const scenarios = new Map();
  for (const file of walk('DOCS/test-plan').filter((f) => f.endsWith('.md'))) {
    for (const line of read(file).split('\n')) {
      const cells = line.split('|').map((c) => c.trim());
      if (cells.length < 6 || !/^P\d+-[A-Z]+-\d{3}\/\d+$/.test(cells[1] ?? '')) continue;
      const [, id, text, levels, status] = cells;
      scenarios.set(id, {
        file,
        text,
        levels: levels
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        status,
      });
    }
  }
  return scenarios;
}

export const parityRows = () => JSON.parse(read('e2e/shared/parity-matrix.json')).rows;
