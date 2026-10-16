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

import type { Page } from '@playwright/test';

import { authResponse, mockApi, type Handler } from './api';

export const EMAIL = { name: 'email', target: 'a***@example.org' };
export const SMS = { name: 'sms', target: '+1******89' };
export const VALID_CODE = 'NMKH4';
export const TFA_TOKEN = 'tfa-token-123';

export interface TwoFactorMock {
  readonly required?: boolean;
  readonly methods?: readonly { name: string; target: string }[];
  readonly canSend?: boolean;
}

/**
 * A backend that asks for a second factor, answering the way the real one does: a wrong code is
 * a 403 domain-rule violation carrying the reason (shape from fineract-backoffice-ui's
 * two-factor spec, which captured it from a running instance).
 */
export async function mockTwoFactor(
  page: Page,
  options: TwoFactorMock = {},
  extra: Record<string, Handler> = {},
) {
  const { required = true, methods = [EMAIL], canSend = true } = options;
  return mockApi(page, {
    'POST /v1/authentication': () => ({
      status: 200,
      body: authResponse(required ? { isTwoFactorAuthenticationRequired: true } : {}),
    }),
    'GET /v1/twofactor': () => ({ status: 200, body: [...methods] }),
    'POST /v1/twofactor': (req) => {
      if (!canSend) return { status: 500, body: {} };
      const name = new URL(req.url()).searchParams.get('deliveryMethod');
      return {
        status: 200,
        body: {
          requestTime: Date.now(),
          tokenLiveTimeInSec: 300,
          extendedAccessToken: false,
          deliveryMethod: methods.find((m) => m.name === name) ?? methods[0],
        },
      };
    },
    'POST /v1/twofactor/validate': (req) =>
      new URL(req.url()).searchParams.get('token') === VALID_CODE
        ? { status: 200, body: { token: TFA_TOKEN, validFrom: 0, validTo: 1 } }
        : {
            status: 403,
            body: {
              userMessageGlobalisationCode: 'validation.msg.domain.rule.violation',
              defaultUserMessage: 'Errors contain reason for domain rule violation.',
              errors: [{ defaultUserMessage: 'The provided one time token is invalid' }],
            },
          },
    'POST /v1/twofactor/invalidate': () => ({ status: 200, body: { resourceId: 1 } }),
    'GET /v1/offices/1': () => ({
      status: 200,
      body: { id: 1, name: 'Head Office', hierarchy: '.' },
    }),
    ...extra,
  });
}
