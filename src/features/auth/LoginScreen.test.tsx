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

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AUTH_API, type AuthApi } from '@/core/adapters/api/auth.api';
import { mapSession } from '@/core/adapters/api/http-auth.api';
import { provide } from '@/core/adapters/registry';
import { APP_STORE, SESSION } from '@/core/tokens';
import { createAppStore } from '@/state/store';
import { SessionStore } from '@/core/auth/session-store';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import { renderWithAdapters } from '@/testing/render';
import { expoRouterMock, resetRouterMock, routerCalls, searchParams } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { LoginScreen } from './LoginScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);
// Loaded only when a provider is configured; these tests configure none.
vi.mock('expo-auth-session', () => ({}));
void expoRouterMock;

function setup(signIn: AuthApi['signIn']) {
  const auth: AuthApi = { signIn: vi.fn(signIn) };
  const view = renderWithAdapters(<LoginScreen />, {
    adapters: [provide(AUTH_API, auth)],
  });
  return { auth, ...view };
}

async function fill(user: ReturnType<typeof userEvent.setup>, password = 'password') {
  await user.type(screen.getByTestId(TID.login.username), 'mifos');
  await user.type(screen.getByTestId(TID.login.password), password);
}

describe('LoginScreen', () => {
  beforeEach(resetRouterMock);

  it('enables submit only for a complete form with a valid server', async () => {
    const user = userEvent.setup();
    setup(async () => mapSession(captured, 'default'));
    const submit = screen.getByTestId(TID.login.submit);
    await waitFor(() => expect(submit).toHaveAttribute('aria-disabled', 'true'));
    await fill(user);
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-disabled', 'true'));
    const server = screen.getByTestId(TID.login.server);
    await user.clear(server);
    await user.type(server, 'ftp://x');
    await waitFor(() => expect(submit).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByText('AUTH.ERRORS.SERVER_INVALID')).toBeInTheDocument();
  });

  it('signs in with the typed tenant, saves the server, stores the session and goes home', async () => {
    const user = userEvent.setup();
    const { auth, registry, fakes } = setup(async (req) => mapSession(captured, req.tenantId));
    const tenant = screen.getByTestId(TID.login.tenant);
    await user.clear(tenant);
    await user.type(tenant, 'acme');
    await fill(user);
    await user.click(screen.getByTestId(TID.login.submit));
    await waitFor(() => expect(routerCalls.replace).toEqual(['/home']));
    expect(auth.signIn).toHaveBeenCalledWith({
      username: 'mifos',
      password: 'password',
      tenantId: 'acme',
    });
    expect(registry.resolve(SESSION).getState()).toMatchObject({
      status: 'signedIn',
      session: { tenantId: 'acme' },
    });
    expect(fakes.storage.readRaw('tenant')).toBe('acme');
  });

  it('shows the credential error, clears the password, and hides the error on edit', async () => {
    const user = userEvent.setup();
    setup(async () => {
      throw new AppError('unauthorized', 401, null, []);
    });
    await fill(user, 'wrong');
    await user.click(screen.getByTestId(TID.login.submit));
    expect(await screen.findByTestId(TID.login.error)).toHaveTextContent(
      'AUTH.ERRORS.INVALID_CREDENTIALS',
    );
    expect(screen.getByTestId(TID.login.password)).toHaveValue('');
    await user.type(screen.getByTestId(TID.login.password), 'x');
    expect(screen.queryByTestId(TID.login.error)).not.toBeInTheDocument();
  });

  it('distinguishes an unreachable server and an unexpected failure', async () => {
    const user = userEvent.setup();
    setup(async () => {
      throw new AppError('network', 0, null, []);
    });
    await fill(user);
    await user.click(screen.getByTestId(TID.login.submit));
    expect(await screen.findByTestId(TID.login.error)).toHaveTextContent('COMMON.ERRORS.NETWORK');
  });

  it('hands an account that needs a second factor to the two-factor step, not to home', async () => {
    const user = userEvent.setup();
    const { fakes } = setup(async () => ({
      ...mapSession(captured, 'default'),
      twoFactorRequired: true,
    }));
    fakes.twoFactorApi.methods = async () => [];
    await fill(user);
    await user.click(screen.getByTestId(TID.login.submit));
    expect(await screen.findByTestId(TID.twoFactor.screen)).toBeInTheDocument();
    expect(fakes.session.getState().status).toBe('twoFactor');
    expect(routerCalls.replace).toEqual([]);
  });

  it('offers identity-provider sign-in only when the deployment configures one', async () => {
    setup(async () => mapSession(captured, 'default'));
    expect(screen.queryByTestId(TID.login.oidc)).not.toBeInTheDocument();
  });

  it('explains a known sign-out reason and ignores an unknown one', () => {
    searchParams.reason = 'inactivity';
    const first = setup(async () => mapSession(captured, 'default'));
    expect(screen.getByTestId(TID.login.notice)).toHaveTextContent('AUTH.NOTICE.INACTIVITY');
    first.unmount();
    searchParams.reason = 'nope';
    setup(async () => mapSession(captured, 'default'));
    expect(screen.queryByTestId(TID.login.notice)).not.toBeInTheDocument();
  });

  it('redirects home when already signed in', async () => {
    // The screen reads the session from the store it is rendered with, so both are provided.
    const appStore = createAppStore({ resolve: () => assert.fail('no thunk runs here') });
    const store = new SessionStore(
      {
        get: async () => null,
        set: async () => undefined,
        remove: async () => undefined,
        clear: async () => undefined,
      },
      () => 'default',
      undefined,
      appStore,
    );
    await store.signIn(mapSession(captured, 'default'));
    renderWithAdapters(<LoginScreen />, {
      adapters: [provide(APP_STORE, appStore), provide(SESSION, store)],
    });
    expect(screen.getByTestId('redirect')).toHaveTextContent('/home');
  });
});
