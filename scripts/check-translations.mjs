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
 * Translation catalogues stay complete and in step with the code:
 *
 *   - every locale has exactly the keys `en` has (no gaps, no leftovers);
 *   - every literal key the code passes to `t('…')` exists in `en`.
 *
 * A missing key renders as the key itself (I18nAdapter), which is visible but still a defect.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = join(ROOT, 'src/i18n/locales');

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const catalogues = Object.fromEntries(
  readdirSync(LOCALES)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [
      f.replace('.json', ''),
      new Set(flatten(JSON.parse(readFileSync(join(LOCALES, f), 'utf8')))),
    ]),
);
const en = catalogues.en;
const problems = [];

for (const [lang, keys] of Object.entries(catalogues)) {
  if (lang === 'en') continue;
  for (const k of en) if (!keys.has(k)) problems.push(`${lang}: missing ${k}`);
  for (const k of keys) if (!en.has(k)) problems.push(`${lang}: ${k} is not in en`);
}

for (const file of walk(join(ROOT, 'src')).filter(
  (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f),
)) {
  for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([A-Z0-9_.]+)'/g)) {
    if (!en.has(m[1]))
      problems.push(`${file.replace(`${ROOT}/`, '')}: t('${m[1]}') has no en translation`);
  }
}

if (problems.length > 0) {
  console.error(`✗ translations:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `✓ translations: ${Object.keys(catalogues).length} catalogues × ${en.size} keys, all code keys present.`,
);
