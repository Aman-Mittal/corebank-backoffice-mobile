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
 * Puts the pinned OpenAPI spec at spec/openapi.json, verified by sha256 (spec/spec.lock.json).
 *
 *   node scripts/fetch-spec.mjs           # download if missing or different; verify
 *   node scripts/fetch-spec.mjs --check   # verify only; exit 1 when absent or mismatched
 *
 * A file whose hash does not match the lock is never used: the generated API types, and so every
 * adapter, are derived from it.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = JSON.parse(readFileSync(join(ROOT, 'spec/spec.lock.json'), 'utf8'));
const OUT = join(ROOT, 'spec/openapi.json');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const current = existsSync(OUT) ? readFileSync(OUT) : null;
if (current && sha256(current) === LOCK.sha256) {
  console.log('✓ spec/openapi.json matches spec.lock.json.');
  process.exit(0);
}
if (process.argv.includes('--check')) {
  console.error(
    `✗ spec/openapi.json is ${current ? 'not the pinned file' : 'missing'}. Run \`npm run setup\`.`,
  );
  process.exit(1);
}

const res = await fetch(LOCK.url);
if (!res.ok) {
  console.error(`✗ Downloading the spec failed: HTTP ${res.status} from ${LOCK.url}`);
  process.exit(1);
}
const body = Buffer.from(await res.arrayBuffer());
const got = sha256(body);
if (got !== LOCK.sha256) {
  console.error(
    `✗ The downloaded spec's sha256 is ${got}, the lock says ${LOCK.sha256}. Refusing it.`,
  );
  process.exit(1);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, body);
console.log(`✓ Downloaded and verified spec/openapi.json (${body.length} bytes).`);
