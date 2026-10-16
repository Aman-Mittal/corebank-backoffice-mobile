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

import { sanitiseFilename, type DownloadAdapter } from './download.adapter';

/** Web: an object URL and a synthetic anchor, revoked in `finally`. */
export function createPlatformDownload(): DownloadAdapter {
  const save: DownloadAdapter['save'] = async (content, filename, mimeType) => {
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content as BlobPart], { type: mimeType ?? 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = sanitiseFilename(filename);
      // Firefox ignores click() on an anchor that is not in the document.
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  return {
    save,
    saveText: (text, filename, mimeType = 'text/plain;charset=utf-8') =>
      save(new Blob([text], { type: mimeType }), filename, mimeType),
  };
}
