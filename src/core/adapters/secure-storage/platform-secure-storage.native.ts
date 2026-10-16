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

import * as SecureStore from 'expo-secure-store';

import { createSecureStorage, type SecureStorageAdapter } from './secure-storage.adapter';

/** Native: Keychain / Android Keystore, readable only while the device is unlocked. */
export function createPlatformSecureStorage(): SecureStorageAdapter {
  const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  return createSecureStorage({
    getItem: (name) => SecureStore.getItemAsync(name, options),
    setItem: (name, value) => SecureStore.setItemAsync(name, value, options),
    removeItem: (name) => SecureStore.deleteItemAsync(name, options),
  });
}
