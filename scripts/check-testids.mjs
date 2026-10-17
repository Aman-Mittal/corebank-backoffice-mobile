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
 * testIDs are a contract between the app and two e2e suites, so they are declared once
 * (e2e/shared/testids.ts) and this checks both directions:
 *
 *   - every `id:` a Maestro flow selects is declared;
 *   - the app never hard-codes a testID string — it must reference `TID.*`, so renaming one is a
 *     compile error in the app and the web specs at once;
 *   - every declared id is used by the app (an unused id is a test selecting nothing).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const walk = (dir) =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = join(dir, name);
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : [rel];
  });

const declared = new Map(); // value -> path (e.g. login.submit -> TID.login.submit)
{
  const text = read('e2e/shared/testids.ts');
  const block = text.slice(text.indexOf('export const TID'), text.indexOf('} as const'));
  const stack = [];
  for (const line of block.split('\n').slice(1)) {
    const open = line.match(/^\s*(\w+):\s*\{\s*$/);
    const leaf = line.match(/^\s*(\w+):\s*'([^']+)'/);
    if (open) stack.push(open[1]);
    else if (leaf) declared.set(leaf[2], `TID.${[...stack, leaf[1]].join('.')}`);
    else if (/^\s*\},?\s*$/.test(line)) stack.pop();
  }
}

/**
 * Generated ids, declared as functions (`navItem: (id) => \`nav.item.${id}\``): a Maestro id
 * with a declared prefix is declared. Only the literal prefix is checked; the suffix is data.
 */
const prefixes = [...read('e2e/shared/testids.ts').matchAll(/=>\s*`([\w.-]+)\$\{/g)].map(
  (m) => m[1],
);

const problems = [];

for (const file of walk('e2e/native').filter((f) => /\.ya?ml$/.test(f))) {
  for (const m of read(file).matchAll(/^\s*id:\s*["']?([\w.\\*+-]+)["']?\s*$/gm)) {
    // A regex id (`clients\.row\..*`, "any row") is checked by its literal part, up to the first
    // unescaped metacharacter, which must be a declared prefix.
    const regex = m[1].includes('\\');
    const id = regex ? m[1].split(/(?<!\\)[.*+]/)[0].replaceAll('\\', '') : m[1];
    const ok = regex
      ? prefixes.includes(id)
      : declared.has(id) || prefixes.some((p) => id.startsWith(p));
    if (!ok) problems.push(`${file}: id "${m[1]}" is not declared in e2e/shared/testids.ts`);
  }
}

const appFiles = walk('src').filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
const used = new Set();
for (const file of appFiles) {
  const text = read(file);
  for (const m of text.matchAll(/testID=\{?["'`]([^"'`]+)["'`]\}?/g)) {
    problems.push(
      `${file}: hard-coded testID "${m[1]}"; use ${declared.get(m[1]) ?? 'a TID.* constant'}`,
    );
  }
  for (const [value, path] of declared) if (text.includes(path)) used.add(value);
}
for (const [value, path] of declared) {
  if (!used.has(value)) problems.push(`${path} ("${value}") is declared but no screen uses it`);
}

if (problems.length > 0) {
  console.error(`✗ testIDs:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `✓ testIDs: ${declared.size} declared, all used by the app, all Maestro selectors declared.`,
);
