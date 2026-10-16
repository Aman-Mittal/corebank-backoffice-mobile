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
 * Prepends this project's Apache-2.0 header to the given files when they have none.
 *
 *   node scripts/add-license-header.mjs <file...>
 *
 * The check (`scripts/check-license.sh`) is what CI enforces; this is only the convenience that
 * makes passing it a one-liner. A file that already carries any Apache-2.0 header — including the
 * ASF header on files carried over from fineract-backoffice-ui — is left exactly as it is.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEADER = readFileSync(join(ROOT, 'scripts/license-header.txt'), 'utf8').trimEnd().split('\n');

const STYLES = {
  block: (lines) => ['/*', ...lines.map((l) => (l ? ` * ${l}` : ' *')), ' */', ''].join('\n'),
  hash: (lines) => [...lines.map((l) => (l ? `# ${l}` : '#')), ''].join('\n'),
};

function styleFor(file) {
  const ext = extname(file);
  if (['.yml', '.yaml', '.sh'].includes(ext)) return STYLES.hash;
  return STYLES.block;
}

let changed = 0;
for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, 'utf8');
  // Detect a header by its grant sentence, not by the licence name, which test text may contain.
  if (
    /Licensed (under|to) the Apache|under the Apache License, Version 2\.0 \(the/.test(
      text.slice(0, 2000),
    )
  )
    continue;
  const header = styleFor(file)(HEADER);
  // A shebang must stay on the first line or the file stops being executable.
  const out = text.startsWith('#!')
    ? text.replace(/^(#![^\n]*\n)/, `$1${header}\n`)
    : `${header}\n${text}`;
  writeFileSync(file, out);
  changed += 1;
}
console.log(`[add-license-header] added a header to ${changed} file(s).`);
