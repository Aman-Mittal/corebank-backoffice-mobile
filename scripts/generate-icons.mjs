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
 * Writes the app's placeholder icons into assets/ (solid brand-colour squares), deterministically.
 *
 * The icons are generated rather than committed because this repository is pushed through the
 * GitHub MCP, which carries text only. Replace them with real artwork before a store release
 * (DOCS/RELEASING.md); `app.json` names these paths.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

/** A size×size RGBA PNG of one colour. */
function solidPng(size, [r, g, b, a]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const row = Buffer.alloc(1 + size * 4);
  for (let x = 0; x < size; x++) row.set([r, g, b, a], 1 + x * 4);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BRAND = [0x1d, 0x4e, 0xd8, 0xff];
const ICONS = {
  'icon.png': [1024, BRAND],
  'splash-icon.png': [512, BRAND],
  'favicon.png': [48, BRAND],
  'android-icon-foreground.png': [512, BRAND],
  'android-icon-background.png': [512, [0xe6, 0xf4, 0xfe, 0xff]],
  'android-icon-monochrome.png': [512, [0xff, 0xff, 0xff, 0xff]],
};

mkdirSync(join(ROOT, 'assets'), { recursive: true });
for (const [name, [size, colour]] of Object.entries(ICONS)) {
  writeFileSync(join(ROOT, 'assets', name), solidPng(size, colour));
}
console.log(`✓ Wrote ${Object.keys(ICONS).length} placeholder icons to assets/.`);
