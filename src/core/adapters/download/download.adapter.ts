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

import { token } from '../registry';

/**
 * Saving a file the user asked for: a report, a statement, a bulk-import template.
 *
 * On web that is the browser's download; on native it is writing to the cache directory and
 * opening the share sheet, which is how a phone "saves" a file. Callers do not choose.
 */
export interface DownloadAdapter {
  /** Saves bytes under a sanitised version of `filename`. */
  save(content: Uint8Array | Blob, filename: string, mimeType?: string): Promise<void>;
  /** Convenience for text content such as CSV. */
  saveText(text: string, filename: string, mimeType?: string): Promise<void>;
}

export const DOWNLOAD = token<DownloadAdapter>('DownloadAdapter');

/** Fallback when sanitisation leaves nothing usable. */
export const DEFAULT_FILENAME = 'download';

/** Longest name produced; leaves room under the 255-byte limit of ext4, APFS and NTFS. */
export const MAX_FILENAME_LENGTH = 200;

/**
 * Reduces a server-supplied filename to something safe to write.
 *
 * Carried over from fineract-backoffice-ui's `BrowserDownloadAdapter`. Names come from whatever
 * a user uploaded, so they are attacker-influenced: the basename is taken (`../../etc/passwd`
 * becomes `passwd`), characters Windows refuses and control characters are replaced, a leading
 * dot or dash is dropped, and an over-long name is truncated with its extension kept.
 */
export function sanitiseFilename(filename: string): string {
  const basename = filename.split(/[/\\]/).findLast(Boolean) ?? '';
  const cleaned = basename
    // eslint-disable-next-line no-control-regex -- control characters are exactly the target
    .replaceAll(/[:*?"<>|\u0000-\u001F]/g, '_')
    .replace(/^[.\-\s]+/, '')
    .trim();

  if (cleaned.length === 0) return DEFAULT_FILENAME;
  if (cleaned.length <= MAX_FILENAME_LENGTH) return cleaned;

  const lastDot = cleaned.lastIndexOf('.');
  if (lastDot <= 0 || cleaned.length - lastDot > 12) return cleaned.slice(0, MAX_FILENAME_LENGTH);
  const extension = cleaned.slice(lastDot);
  return cleaned.slice(0, MAX_FILENAME_LENGTH - extension.length) + extension;
}
