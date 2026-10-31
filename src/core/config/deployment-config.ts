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

import { token } from '@/core/adapters/registry';

/** An identity provider the deployment offers for sign-in. */
export interface OidcConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly scopes: readonly string[];
  /** Shown as "Sign in with <label>". */
  readonly label: string;
}

/**
 * Settings an operator changes per deployment without rebuilding. On web they come from an
 * optional `/config.json` served beside the app; on native from `EXPO_PUBLIC_*` build variables.
 * Everything is optional: a deployment that configures nothing gets the default app.
 */
export interface DeploymentConfig {
  readonly oidc: OidcConfig | null;
  /**
   * The app's own permission gates (navigation, route guard, controls). A deployment may switch
   * them off; the server still checks every request (DOCS/test-plan/P1-15-…md).
   */
  readonly rbacEnabled: boolean;
}

export const EMPTY_DEPLOYMENT_CONFIG: DeploymentConfig = { oidc: null, rbacEnabled: true };

const DEFAULT_SCOPES = ['openid', 'profile', 'email'] as const;

/**
 * Validates untrusted configuration. Anything unusable is dropped rather than half-applied: an
 * identity provider without an https issuer and a client id is not offered. The gates stay on
 * unless the configuration says `false` (a build variable says it as a string).
 */
export function parseDeploymentConfig(raw: unknown): DeploymentConfig {
  if (!raw || typeof raw !== 'object') return EMPTY_DEPLOYMENT_CONFIG;
  const { oidc, rbacEnabled } = raw as { oidc?: unknown; rbacEnabled?: unknown };
  return {
    oidc: parseOidc(oidc),
    rbacEnabled: rbacEnabled !== false && rbacEnabled !== 'false',
  };
}

function parseOidc(oidc: unknown): OidcConfig | null {
  if (!oidc || typeof oidc !== 'object') return null;
  const { issuer, clientId, scopes, label } = oidc as Record<string, unknown>;
  if (typeof issuer !== 'string' || typeof clientId !== 'string' || clientId.trim() === '') {
    return null;
  }
  let url: URL;
  try {
    url = new URL(issuer);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const scopeList =
    typeof scopes === 'string'
      ? scopes.split(/[\s,]+/).filter(Boolean)
      : Array.isArray(scopes)
        ? scopes.filter((s): s is string => typeof s === 'string' && s.length > 0)
        : [];
  return {
    issuer: issuer.replace(/\/+$/, ''),
    clientId: clientId.trim(),
    scopes: scopeList.length > 0 ? scopeList : [...DEFAULT_SCOPES],
    label: typeof label === 'string' && label.trim() ? label.trim() : url.hostname,
  };
}

/** Holds the loaded configuration. `load()` runs once at start; `get()` is synchronous after. */
export interface DeploymentConfigStore {
  load(): Promise<DeploymentConfig>;
  get(): DeploymentConfig;
}

export const DEPLOYMENT_CONFIG = token<DeploymentConfigStore>('DeploymentConfig');

export function createDeploymentConfigStore(source: () => Promise<unknown>): DeploymentConfigStore {
  let current = EMPTY_DEPLOYMENT_CONFIG;
  let pending: Promise<DeploymentConfig> | null = null;
  return {
    load() {
      pending ??= source()
        .then(parseDeploymentConfig)
        .catch(() => EMPTY_DEPLOYMENT_CONFIG)
        .then((config) => (current = config));
      return pending;
    },
    get: () => current,
  };
}
