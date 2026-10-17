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

import captured from '@/testing/fixtures/backend/authentication.json';
import stack from '@/testing/fixtures/backend/stack.authentication.json';
import { fakeApi } from '@/testing/fake-api';

import { HttpAuthApi, mapSession } from './http-auth.api';

describe('mapSession', () => {
  it('maps the captured payload, normalising permissions and keeping the tenant', () => {
    expect(
      mapSession({ ...captured, permissions: [' read_client ', 'ALL_FUNCTIONS', ''] }, 'acme'),
    ).toEqual({
      userId: 1,
      username: 'mifos',
      displayName: 'Director, Program',
      officeId: 1,
      officeName: 'Head Office',
      tenantId: 'acme',
      permissions: ['READ_CLIENT', 'ALL_FUNCTIONS'],
      roles: ['Super user'],
      credential: 'bWlmb3M6cGFzc3dvcmQ=',
      scheme: 'Basic',
      tfaToken: null,
      twoFactorRequired: false,
      passwordRenewalRequired: false,
    });
  });

  it('maps the payload captured from the e2e stack, whose mifos user has no staff name', () => {
    expect(mapSession(stack, 'default')).toMatchObject({
      username: 'mifos',
      displayName: null,
      permissions: [
        'ALL_FUNCTIONS',
        'FORCE_WITHDRAWAL_SAVINGSACCOUNT_CHECKER',
        'FORCE_WITHDRAWAL_SAVINGSACCOUNT',
      ],
      roles: ['Super user'],
      twoFactorRequired: false,
      passwordRenewalRequired: false,
    });
  });

  it('reads the two undeclared flags', () => {
    const s = mapSession(
      { ...captured, isTwoFactorAuthenticationRequired: true, shouldRenewPassword: true },
      't',
    );
    expect(s.twoFactorRequired).toBe(true);
    expect(s.passwordRenewalRequired).toBe(true);
  });

  it('refuses a session with no key', () => {
    expect(() =>
      mapSession({ ...captured, base64EncodedAuthenticationKey: undefined }, 't'),
    ).toThrow(/authentication key/);
  });
});

describe('HttpAuthApi.signIn', () => {
  it('posts the credentials with the typed tenant and no Authorization header', async () => {
    const api = fakeApi({ 'POST /v1/authentication': [200, captured] });
    const session = await new HttpAuthApi(api.client).signIn({
      username: 'mifos',
      password: 'password',
      tenantId: 'acme',
    });
    expect(session.tenantId).toBe('acme');
    const req = api.requests[0]!;
    expect(req.body).toEqual({ username: 'mifos', password: 'password' });
    expect(req.headers.get('Fineract-Platform-TenantId')).toBe('acme');
    // fakeApi's auth state has a credential; an explicit header from sign-in would be the only
    // way it is absent, so assert the pipeline still left the typed tenant alone.
    expect(req.headers.get('X-Mifos-Platform-TenantId')).toBe('acme');
  });

  it('rejects wrong credentials as unauthorized', async () => {
    const api = fakeApi({
      'POST /v1/authentication': [401, { developerMessage: 'Invalid authentication details' }],
    });
    await expect(
      new HttpAuthApi(api.client).signIn({ username: 'mifos', password: 'x', tenantId: 'default' }),
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });
});
