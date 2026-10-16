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

import { createMMKV } from 'react-native-mmkv';

import { createStorage, memoryBackend, type StorageAdapter } from './storage.adapter';

/**
 * Native: MMKV for `device`; memory for `session`, so it ends with the process exactly as a tab's
 * `sessionStorage` ends with the tab.
 */
export function createPlatformStorage(): StorageAdapter {
  const device = createMMKV({ id: 'mbo-device' });
  const session = memoryBackend();
  return createStorage(() => ({
    session,
    device: {
      getItem: (name) => device.getString(name) ?? null,
      setItem: (name, value) => device.set(name, value),
      removeItem: (name) => void device.remove(name),
    },
  }));
}
