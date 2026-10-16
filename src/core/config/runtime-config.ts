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

import type { StorageAdapter } from '@/core/adapters/storage/storage.adapter';

/** Where the app sends requests, and as which tenant. */
export interface ServerConfig {
  /** Base URL up to and including `/api`; generated paths start at `/v1`. */
  readonly apiBaseUrl: string;
  readonly tenantId: string;
}

/**
 * Build-time defaults, from `EXPO_PUBLIC_*` variables (inlined by Expo at build time).
 * The values here are what the local e2e stack serves.
 */
export const BUILD_DEFAULTS: ServerConfig = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://localhost:8443/fineract-provider/api',
  tenantId: process.env.EXPO_PUBLIC_TENANT_ID ?? 'default',
};

/** Accepts only an absolute http(s) URL; anything else is not a server address. */
export function isValidApiBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * The active server: the user's override when it is valid, otherwise the build default.
 *
 * An override that fails validation is ignored rather than trusted — every credential the user
 * types next would go wherever it points.
 */
export function readServerConfig(storage: StorageAdapter): ServerConfig {
  const override = storage.read<Partial<ServerConfig> | null>('runtimeConfig', null);
  const apiBaseUrl =
    override?.apiBaseUrl && isValidApiBaseUrl(override.apiBaseUrl)
      ? override.apiBaseUrl
      : BUILD_DEFAULTS.apiBaseUrl;
  const tenantId = storage.readRaw('tenant') || override?.tenantId || BUILD_DEFAULTS.tenantId;
  return { apiBaseUrl, tenantId };
}

export function writeServerConfig(storage: StorageAdapter, config: ServerConfig): void {
  if (!isValidApiBaseUrl(config.apiBaseUrl)) {
    throw new Error(`Not a server address: ${config.apiBaseUrl}`);
  }
  storage.write('runtimeConfig', { apiBaseUrl: config.apiBaseUrl });
  storage.writeRaw('tenant', config.tenantId);
}
