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

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { sanitiseFilename, type DownloadAdapter } from './download.adapter';

/**
 * Native: write into the cache directory, then hand the file to the share sheet.
 *
 * The cache directory is the right home: the OS may reclaim it, and a report the user has
 * already shared or saved elsewhere has no reason to occupy their storage.
 */
export function createPlatformDownload(): DownloadAdapter {
  const save: DownloadAdapter['save'] = async (content, filename, mimeType) => {
    const bytes =
      content instanceof Uint8Array ? content : new Uint8Array(await content.arrayBuffer());
    const file = new File(Paths.cache, sanitiseFilename(filename));
    file.create({ overwrite: true });
    file.write(bytes);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, mimeType ? { mimeType } : undefined);
    }
  };
  return {
    save,
    saveText: (text, filename, mimeType = 'text/plain') =>
      save(new TextEncoder().encode(text), filename, mimeType),
  };
}
