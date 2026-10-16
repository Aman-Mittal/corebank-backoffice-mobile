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

import type { Page, Request, Route } from '@playwright/test';

/** The API base the web export is built against (BUILD_DEFAULTS in runtime-config.ts). */
export const MOCK_API = 'https://localhost:8443/fineract-provider/api';

type Json = Record<string, unknown> | unknown[];
export type Handler = (req: Request) => { status: number; body?: Json } | undefined;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Answers API calls in the browser, the mocked-project equivalent of a backend.
 *
 * The export calls an absolute, cross-origin API, so every answer carries CORS headers and the
 * preflight that custom headers (tenant, Authorization) trigger is answered too. Each handler is
 * `METHOD /v1/path` → response; an unmatched call answers 501 and is recorded, so a spec that
 * forgot a stub fails on it instead of hanging.
 */
export async function mockApi(page: Page, handlers: Record<string, Handler>) {
  const calls: {
    method: string;
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
  }[] = [];
  const unmatched: string[] = [];
  await page.route(`${MOCK_API}/**`, async (route: Route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const path = new URL(req.url()).pathname.replace(new URL(MOCK_API).pathname, '');
    const key = `${req.method()} ${path}`;
    calls.push({
      method: req.method(),
      path,
      query: Object.fromEntries(new URL(req.url()).searchParams),
      headers: req.headers(),
      body: req.postDataJSON?.() ?? null,
    });
    const answer = handlers[key]?.(req);
    if (!answer) {
      unmatched.push(key);
      return route.fulfill({
        status: 501,
        headers: CORS,
        json: { developerMessage: `unmocked ${key}` },
      });
    }
    return route.fulfill({ status: answer.status, headers: CORS, json: answer.body ?? {} });
  });
  return { calls, unmatched };
}

/**
 * A sign-in response in the shape `POST /v1/authentication` sends. Fields the generated type does
 * not declare (`isTwoFactorAuthenticationRequired`, `shouldRenewPassword`) are sent by the server
 * and included here so specs exercise them.
 */
export function authResponse(overrides: Record<string, unknown> = {}) {
  return {
    username: 'mifos',
    userId: 1,
    base64EncodedAuthenticationKey: 'bWlmb3M6cGFzc3dvcmQ=',
    authenticated: true,
    officeId: 1,
    officeName: 'Head Office',
    staffDisplayName: 'Director, Program',
    roles: [
      { id: 1, name: 'Super user', description: 'This role provides all application permissions.' },
    ],
    permissions: ['ALL_FUNCTIONS'],
    shouldRenewPassword: false,
    isTwoFactorAuthenticationRequired: false,
    ...overrides,
  };
}

/** `POST /v1/authentication` accepting only mifos/password, as the demo backend does. */
export const signInHandler =
  (overrides: Record<string, unknown> = {}): Handler =>
  (req) => {
    const body = req.postDataJSON() as { username?: string; password?: string };
    return body.username === 'mifos' && body.password === 'password'
      ? { status: 200, body: authResponse(overrides) }
      : {
          status: 401,
          body: {
            developerMessage: 'Invalid authentication details were passed in api request.',
            httpStatusCode: '401',
            defaultUserMessage: 'Unauthenticated. Please login.',
            userMessageGlobalisationCode: 'error.msg.not.authenticated',
            errors: [],
          },
        };
  };
