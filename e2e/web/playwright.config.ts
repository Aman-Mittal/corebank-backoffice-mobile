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

import os from 'node:os';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_WEB_PORT ?? 8081);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Web e2e. Projects mirror fineract-backoffice-ui's, selected by directory:
 *
 * - `mocked`: Desktop Chrome, every API call answered by `page.route` fixtures. Runs on every PR.
 * - `mobile`: the mocked specs tagged `@mobile`, at Pixel 7 size.
 * - `backend`: no mocks, against the docker stack (`npm run e2e:stack`). Needs `setup`.
 * - `two-factor`: the 2FA stack. Nightly.
 *
 * Runs against the static web export (`npm run web:export`), the artifact that ships, not the
 * dev server. `workers: 1` on CI and against the backend: the machine and the backend are shared.
 */
export default defineConfig({
  testDir: './specs',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? path.join(os.tmpdir(), 'mfi-e2e-output'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  // On CI, `github` turns each failure into a check annotation, which can be read without
  // access to the job logs.
  // The pending probe also says why each expected-red spec is still red (red-reporter.ts).
  reporter: process.env.CI
    ? [
        ['list'],
        ['github'],
        ['html', { open: 'never' }],
        ...(process.env.PENDING_PROBE === '1' ? [['./red-reporter.ts'] as const] : []),
      ]
    : 'list',
  expect: { timeout: Number(process.env.E2E_ACTION_TIMEOUT ?? 10_000) },
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    // Actions fail on their own deadline rather than running into the test timeout. An
    // expected-red spec (`test.fail()`) must *fail*; a timeout is a different outcome, and
    // Playwright would report it as unexpected.
    actionTimeout: Number(process.env.E2E_ACTION_TIMEOUT ?? 10_000),
    navigationTimeout: 15_000,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    timezoneId: 'Asia/Kolkata',
    locale: 'en-US',
  },
  projects: [
    { name: 'setup', testDir: './setup', testMatch: /.*\.setup\.ts/ },
    { name: 'mocked', testMatch: 'mocked/**/*.spec.ts', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      testMatch: 'mocked/**/*.spec.ts',
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'backend',
      testMatch: 'backend/**/*.spec.ts',
      dependencies: ['setup'],
      timeout: 120_000,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'two-factor',
      testMatch: 'two-factor/**/*.spec.ts',
      timeout: 180_000,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx serve dist --single --listen ${PORT} --no-clipboard`,
    // The command runs from the repository root, where `dist/` is; Playwright's default is this
    // file's directory.
    cwd: path.resolve(__dirname, '../..'),
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
