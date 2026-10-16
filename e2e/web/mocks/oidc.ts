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

import type { BrowserContext, Route } from '@playwright/test';

export const ISSUER = 'https://idp.test/realms/bank';
export const ACCESS_TOKEN = 'idp-access-token-xyz';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** Serves `/config.json` to every page of the context, including the provider popup. */
export async function serveDeploymentConfig(context: BrowserContext, config: object | null) {
  await context.route('**/config.json', (route) =>
    config === null
      ? route.fulfill({ status: 404, body: '' })
      : route.fulfill({ status: 200, json: config }),
  );
}

export const OIDC_CONFIG = { oidc: { issuer: ISSUER, clientId: 'backoffice', label: 'Bank SSO' } };

/**
 * A minimal OpenID provider: discovery, an authorize endpoint that immediately redirects back
 * with a code (or an error, to model a cancel), and a token endpoint that records what it was
 * sent. Routed on the context because the authorize step runs in a popup.
 */
export async function mockIdentityProvider(context: BrowserContext, { cancel = false } = {}) {
  const tokenRequests: URLSearchParams[] = [];
  await context.route(`${ISSUER}/**`, async (route: Route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(req.url());
    if (url.pathname.endsWith('/.well-known/openid-configuration')) {
      return route.fulfill({
        status: 200,
        headers: CORS,
        json: {
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/protocol/openid-connect/auth`,
          token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
          response_types_supported: ['code'],
          code_challenge_methods_supported: ['S256'],
        },
      });
    }
    if (url.pathname.endsWith('/auth')) {
      const back = new URL(url.searchParams.get('redirect_uri')!);
      back.searchParams.set('state', url.searchParams.get('state') ?? '');
      if (cancel) back.searchParams.set('error', 'access_denied');
      else back.searchParams.set('code', 'auth-code-1');
      return route.fulfill({ status: 302, headers: { Location: back.toString() } });
    }
    if (url.pathname.endsWith('/token')) {
      tokenRequests.push(new URLSearchParams(req.postData() ?? ''));
      return route.fulfill({
        status: 200,
        headers: CORS,
        json: { access_token: ACCESS_TOKEN, token_type: 'Bearer', expires_in: 300 },
      });
    }
    return route.fulfill({ status: 404, headers: CORS, body: '' });
  });
  return { tokenRequests };
}
