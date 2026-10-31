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

import {
  createDeploymentConfigStore,
  EMPTY_DEPLOYMENT_CONFIG,
  parseDeploymentConfig,
} from './deployment-config';

describe('parseDeploymentConfig', () => {
  it.each([
    null,
    'x',
    {},
    { oidc: null },
    { oidc: { clientId: 'c' } },
    { oidc: { issuer: 'http://idp', clientId: 'c' } },
    { oidc: { issuer: 'not a url', clientId: 'c' } },
    { oidc: { issuer: 'https://idp.test', clientId: ' ' } },
  ])('gives no provider for %j', (raw) => {
    expect(parseDeploymentConfig(raw)).toEqual(EMPTY_DEPLOYMENT_CONFIG);
  });

  it('fills default scopes and a label from the issuer host', () => {
    expect(
      parseDeploymentConfig({
        oidc: { issuer: 'https://idp.test/realms/bank/', clientId: ' app ' },
      }),
    ).toEqual({
      oidc: {
        issuer: 'https://idp.test/realms/bank',
        clientId: 'app',
        scopes: ['openid', 'profile', 'email'],
        label: 'idp.test',
      },
      rbacEnabled: true,
    });
  });

  it('keeps the gates on unless the configuration says false, with or without a provider', () => {
    expect(parseDeploymentConfig({ rbacEnabled: false })).toEqual({
      oidc: null,
      rbacEnabled: false,
    });
    expect(parseDeploymentConfig({ oidc: null, rbacEnabled: 'false' }).rbacEnabled).toBe(false);
    for (const value of [true, 'true', undefined, 0, 'no']) {
      expect(parseDeploymentConfig({ rbacEnabled: value }).rbacEnabled).toBe(true);
    }
  });

  it('accepts scopes as a string or an array, and a label', () => {
    expect(
      parseDeploymentConfig({
        oidc: {
          issuer: 'https://i.test',
          clientId: 'c',
          scopes: 'openid, roles',
          label: 'Bank SSO',
        },
      }).oidc,
    ).toMatchObject({
      scopes: ['openid', 'roles'],
      label: 'Bank SSO',
    });
    expect(
      parseDeploymentConfig({
        oidc: { issuer: 'https://i.test', clientId: 'c', scopes: ['openid', 3] },
      }).oidc?.scopes,
    ).toEqual(['openid']);
  });
});

describe('createDeploymentConfigStore', () => {
  it('loads once, and a failing source is no configuration rather than an error', async () => {
    let calls = 0;
    const store = createDeploymentConfigStore(async () => {
      calls += 1;
      throw new Error('404');
    });
    expect(store.get()).toEqual(EMPTY_DEPLOYMENT_CONFIG);
    await Promise.all([store.load(), store.load()]);
    expect(calls).toBe(1);
    expect(store.get()).toEqual(EMPTY_DEPLOYMENT_CONFIG);
  });

  it('exposes a loaded provider synchronously after load', async () => {
    const store = createDeploymentConfigStore(async () => ({
      oidc: { issuer: 'https://i.test', clientId: 'c' },
    }));
    await store.load();
    expect(store.get().oidc?.clientId).toBe('c');
  });
});
