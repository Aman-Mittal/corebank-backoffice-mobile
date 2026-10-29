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

import { configureStore, isPlain, type Middleware } from '@reduxjs/toolkit';

import { mapSession } from '@/core/adapters/api/http-auth.api';
import { mapUserProfile } from '@/core/adapters/api/http-profile.api';
import { PROFILE_API, type ProfileApi } from '@/core/adapters/api/profile.api';
import { signedIn, signedOut } from '@/core/auth/session-slice';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import user from '@/testing/fixtures/backend/user.one.json';
import { createAppStore } from '@/state/store';

import {
  changePassword,
  loadPasswordPolicy,
  loadProfile,
  passwordFormClosed,
  passwordFormToggled,
  profileSlice,
} from './profile-slice';

const MIFOS = mapUserProfile(user);

function setup(overrides: Partial<ProfileApi> = {}) {
  const api: ProfileApi = {
    get: vi.fn(async (id: number) => ({ ...MIFOS, id })),
    passwordPolicy: vi.fn(async () => 'At least 6 characters'),
    changePassword: vi.fn(async () => undefined),
    ...overrides,
  };
  const store = createAppStore({
    resolve: <T>(token: unknown) => {
      expect(token).toBe(PROFILE_API);
      return api as T;
    },
  });
  return { api, store, profile: () => store.getState().profile };
}

describe('profile slice', () => {
  it('loads a record: loading, then loaded', async () => {
    const { store, profile } = setup();
    const done = store.dispatch(loadProfile(1));
    expect(profile()).toMatchObject({ userId: 1, status: 'loading', user: null });
    await done;
    expect(profile()).toMatchObject({ userId: 1, status: 'loaded', user: MIFOS });
  });

  it('records a failed read as serializable data', async () => {
    const { store, profile } = setup({
      get: vi.fn(async () => {
        throw new AppError('forbidden', 403, 'No', []);
      }),
    });
    await store.dispatch(loadProfile(1));
    expect(profile().status).toBe('failed');
    expect(profile().error).toEqual({
      kind: 'forbidden',
      status: 403,
      summary: 'No',
      messages: [],
      correlationId: null,
    });
    expect(isPlain(profile().error)).toBe(true);
  });

  it('ignores the reply for a user no longer asked about', async () => {
    let answer!: (p: typeof MIFOS) => void;
    const { store, profile } = setup({
      get: vi
        .fn()
        .mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
        .mockImplementation(async (id: number) => ({ ...MIFOS, id, username: 'clerk' })),
    });
    const first = store.dispatch(loadProfile(1));
    await store.dispatch(loadProfile(7));
    answer(MIFOS);
    await first;
    expect(profile()).toMatchObject({ userId: 7, user: { username: 'clerk' } });
  });

  it('keeps the active policy, or none when it cannot be read', async () => {
    const { store, profile } = setup();
    await store.dispatch(loadPasswordPolicy());
    expect(profile().policy).toBe('At least 6 characters');
    const failing = setup({
      passwordPolicy: vi.fn(async () => {
        throw new AppError('forbidden', 403, null, []);
      }),
    });
    await failing.store.dispatch(loadPasswordPolicy());
    expect(failing.profile().policy).toBeNull();
  });

  it('changes the password: saving, then saved with the form closed', async () => {
    const { api, store, profile } = setup();
    store.dispatch(passwordFormToggled());
    expect(profile().passwordFormOpen).toBe(true);
    const done = store.dispatch(changePassword(1, { password: 'p', repeatPassword: 'p' }));
    expect(profile().passwordStatus).toBe('saving');
    await done;
    expect(profile()).toMatchObject({ passwordStatus: 'saved', passwordFormOpen: false });
    expect(api.changePassword).toHaveBeenCalledWith(1, { password: 'p', repeatPassword: 'p' });
  });

  it('keeps a refusal with the form open, and Cancel clears it', async () => {
    const { store, profile } = setup({
      changePassword: vi.fn(async () => {
        throw new AppError('validation', 400, 'Too short', []);
      }),
    });
    store.dispatch(passwordFormToggled());
    await store.dispatch(changePassword(1, { password: 'p', repeatPassword: 'p' }));
    expect(profile()).toMatchObject({
      passwordStatus: 'failed',
      passwordFormOpen: true,
      passwordError: { summary: 'Too short' },
    });
    store.dispatch(passwordFormClosed());
    expect(profile()).toMatchObject({
      passwordStatus: 'idle',
      passwordError: null,
      passwordFormOpen: false,
    });
  });

  it('never puts the passwords in an action or in the state', async () => {
    const actions: unknown[] = [];
    const record: Middleware = () => (next) => (action) => {
      actions.push(action);
      return next(action);
    };
    const api = setup().api;
    const store = configureStore({
      reducer: { profile: profileSlice.reducer },
      middleware: (defaults) =>
        defaults({ thunk: { extraArgument: { resolve: <T>() => api as T } } }).concat(record),
    });
    await store.dispatch(changePassword(1, { password: 'secret!', repeatPassword: 'secret!' }));
    expect(actions.length).toBeGreaterThan(0);
    expect(JSON.stringify(actions)).not.toContain('secret!');
    expect(JSON.stringify(store.getState())).not.toContain('secret!');
  });

  it('is reset when a session ends or begins', async () => {
    const { store, profile } = setup();
    await store.dispatch(loadProfile(1));
    store.dispatch(signedOut(null));
    expect(profile()).toMatchObject({ userId: null, user: null, status: 'idle' });
    await store.dispatch(loadProfile(1));
    store.dispatch(signedIn(mapSession(captured, 'default')));
    expect(profile().user).toBeNull();
  });
});
