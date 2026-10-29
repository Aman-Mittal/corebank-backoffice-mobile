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

import policy from '@/testing/fixtures/backend/passwordpreferences.json';
import user from '@/testing/fixtures/backend/user.one.json';
import { AppError } from '@/core/http/app-error';
import { fakeApi } from '@/testing/fake-api';

import { activePolicy, HttpProfileApi, mapUserProfile } from './http-profile.api';

describe('mapUserProfile (captured payload)', () => {
  it('reads the record and the selected roles by name', () => {
    expect(mapUserProfile(user)).toEqual({
      id: 1,
      username: 'mifos',
      firstname: 'App',
      lastname: 'Administrator',
      email: 'demomfi@mifos.org',
      officeId: 1,
      officeName: 'Head Office',
      roles: ['Super user'],
    });
  });

  it('answers null for absent or blank fields, and no roles when none are sent', () => {
    expect(mapUserProfile({ id: 4, username: 'x', email: '' })).toEqual({
      id: 4,
      username: 'x',
      firstname: null,
      lastname: null,
      email: null,
      officeId: null,
      officeName: null,
      roles: [],
    });
  });

  it('fails loudly on a user with no id', () => {
    expect(() => mapUserProfile({ username: 'x' })).toThrow(/no id/);
  });
});

describe('activePolicy', () => {
  it('reads the one policy the server sends (captured)', () => {
    expect(activePolicy(policy)).toMatch(/^Password must be 12 to 50 characters/);
  });

  it('reads the active one from a list, and answers null when none is active', () => {
    const list = [
      { id: 1, description: 'simple', active: false },
      { id: 2, description: 'strong', active: true },
    ];
    expect(activePolicy(list)).toBe('strong');
    expect(activePolicy([{ id: 1, description: 'simple', active: false }])).toBeNull();
    expect(activePolicy(undefined)).toBeNull();
  });
});

describe('HttpProfileApi', () => {
  it('gets a user by id', async () => {
    const api = fakeApi({ 'GET /v1/users/1': [200, user] });
    expect((await new HttpProfileApi(api.client).get(1)).username).toBe('mifos');
  });

  it('reads the password policy', async () => {
    const api = fakeApi({ 'GET /v1/passwordpreferences': [200, policy] });
    expect(await new HttpProfileApi(api.client).passwordPolicy()).toMatch(/^Password must/);
  });

  it('posts both passwords, and rejects with the server reason when refused', async () => {
    const api = fakeApi({
      'POST /v1/users/1/pwd': (body) =>
        (body as { password: string }).password === 'ok-password'
          ? [200, { resourceId: 1 }]
          : [
              400,
              {
                defaultUserMessage: 'Validation errors exist.',
                errors: [{ parameterName: 'password', defaultUserMessage: 'Too short' }],
              },
            ],
    });
    const http = new HttpProfileApi(api.client);
    await http.changePassword(1, { password: 'ok-password', repeatPassword: 'ok-password' });
    expect(api.requests[0]!.body).toEqual({
      password: 'ok-password',
      repeatPassword: 'ok-password',
    });
    const refused = http.changePassword(1, { password: 'x', repeatPassword: 'x' });
    await expect(refused).rejects.toBeInstanceOf(AppError);
    await expect(refused).rejects.toMatchObject({
      kind: 'validation',
      messages: [{ field: 'password', message: 'Too short' }],
    });
  });
});
