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

import { randomBytes } from 'node:crypto';

import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Direct REST access for seeding and assertions, bypassing the UI.
 *
 * Defaults match `deploy/docker-compose-e2e.yml`. The credentials are the stack's well-known
 * demo defaults, never a real system's.
 */
export const apiBaseUrl = () =>
  process.env.E2E_API_BASE_URL ?? 'https://localhost:8443/fineract-provider/api';
const tenant = () => process.env.E2E_TENANT ?? 'default';
const basic = () =>
  Buffer.from(
    `${process.env.E2E_USER ?? 'mifos'}:${process.env.E2E_PASSWORD ?? 'password'}`,
  ).toString('base64');

/** Headers for the demo superuser. */
export const adminHeaders = () => ({
  'Fineract-Platform-TenantId': tenant(),
  Authorization: `Basic ${basic()}`,
  'Content-Type': 'application/json',
});

export function fineractGet(request: APIRequestContext, path: string): Promise<APIResponse> {
  return request.get(`${apiBaseUrl()}${path}`, {
    headers: adminHeaders(),
    ignoreHTTPSErrors: true,
  });
}

export function fineractPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<APIResponse> {
  return request.post(`${apiBaseUrl()}${path}`, {
    headers: adminHeaders(),
    data: body,
    ignoreHTTPSErrors: true,
  });
}

/**
 * A unique suffix per run, so seeded names never collide across retries or reruns. It also goes
 * into seeded users' passwords, so the random part comes from a CSPRNG, not `Math.random`.
 */
export const runId = () => `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
