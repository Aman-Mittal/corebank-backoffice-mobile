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

import { fakeApi } from '@/testing/fake-api';

import { HttpUserDetailsApi, mapUserDetails } from './http-user-details.api';
import { OidcUnsupportedError } from './user-details.api';

const DETAILS = {
  username: 'sso-user',
  userId: 7,
  officeId: 1,
  officeName: 'Head Office',
  permissions: ['READ_CLIENT '],
  roles: [{ id: 2, name: 'Clerk' }],
  authenticated: true,
};

describe('HttpUserDetailsApi', () => {
  it('maps /userdetails to a Bearer session', () => {
    expect(mapUserDetails(DETAILS, 'acme', 'tok')).toEqual({
      userId: 7,
      username: 'sso-user',
      displayName: null,
      officeId: 1,
      officeName: 'Head Office',
      tenantId: 'acme',
      permissions: ['READ_CLIENT'],
      roles: ['Clerk'],
      credential: 'tok',
      scheme: 'Bearer',
      tfaToken: null,
      twoFactorRequired: false,
      passwordRenewalRequired: false,
    });
  });

  it('asks with the access token and the tenant explicitly', async () => {
    const api = fakeApi({ 'GET /v1/userdetails': [200, DETAILS] });
    const session = await new HttpUserDetailsApi(api.client).sessionFor('tok', 'acme');
    expect(session.username).toBe('sso-user');
    expect(api.requests[0]!.headers.get('Authorization')).toBe('Bearer tok');
    expect(api.requests[0]!.headers.get('Fineract-Platform-TenantId')).toBe('acme');
  });

  it.each([401, 403, 404])('turns %i into OidcUnsupportedError', async (status) => {
    const http = new HttpUserDetailsApi(fakeApi({ 'GET /v1/userdetails': [status, {}] }).client);
    await expect(http.sessionFor('tok', 'default')).rejects.toBeInstanceOf(OidcUnsupportedError);
  });

  it('passes other failures through', async () => {
    const http = new HttpUserDetailsApi(fakeApi({ 'GET /v1/userdetails': [500, {}] }).client);
    await expect(http.sessionFor('tok', 'default')).rejects.toMatchObject({ kind: 'server' });
  });
});
