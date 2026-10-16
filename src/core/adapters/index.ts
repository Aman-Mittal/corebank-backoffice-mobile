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

export { AdapterRegistry, provide, token } from './registry';
export type { AdapterFactory, AdapterOverride, AdapterToken } from './registry';
export { AdapterProvider, useAdapter } from './AdapterProvider';
export { STORAGE, STORAGE_KEYS } from './storage/storage.adapter';
export type { StorageAdapter, StorageKey, StorageScope } from './storage/storage.adapter';
export { SECURE_STORAGE } from './secure-storage/secure-storage.adapter';
export type { SecureKey, SecureStorageAdapter } from './secure-storage/secure-storage.adapter';
export { I18N, SUPPORTED_LANGUAGES } from './i18n/i18n.adapter';
export type { I18nAdapter, Language } from './i18n/i18n.adapter';
export { DOWNLOAD, sanitiseFilename } from './download/download.adapter';
export type { DownloadAdapter } from './download/download.adapter';
export { NETWORK } from './network/network.adapter';
export type { NetworkAdapter } from './network/network.adapter';
export { CLOCK } from './clock/clock.adapter';
export type { ClockAdapter } from './clock/clock.adapter';
