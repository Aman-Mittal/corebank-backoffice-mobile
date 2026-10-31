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

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mapSession } from '@/core/adapters/api/http-auth.api';
import { mapUserProfile } from '@/core/adapters/api/http-profile.api';
import { PROFILE_API, type ProfileApi } from '@/core/adapters/api/profile.api';
import { provide } from '@/core/adapters/registry';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import user from '@/testing/fixtures/backend/user.one.json';
import { renderWithAdapters } from '@/testing/render';

import { TID } from '../../../e2e/shared/testids';
import { ProfileScreen } from './ProfileScreen';

// The page frame reads the path for its breadcrumbs.
vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const MIFOS = mapUserProfile(user);

function api(overrides: Partial<ProfileApi> = {}): ProfileApi {
  return {
    get: vi.fn(async () => MIFOS),
    passwordPolicy: vi.fn(async () => 'At least 6 characters'),
    changePassword: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function render(profileApi = api()) {
  const view = renderWithAdapters(<ProfileScreen />, {
    adapters: [provide(PROFILE_API, profileApi)],
  });
  await act(() => view.fakes.session.signIn(mapSession(captured, 'default')));
  return { ...view, profileApi };
}

async function openForm() {
  await userEvent.click(screen.getByTestId(TID.profile.changePassword));
  return {
    password: screen.getByTestId(TID.profile.newPassword),
    repeat: screen.getByTestId(TID.profile.repeatPassword),
    save: screen.getByTestId(TID.profile.submit),
  };
}

describe('ProfileScreen', () => {
  it("shows the signed-in user's record, read by the session's user id", async () => {
    const { profileApi } = await render();
    expect(await screen.findByTestId(TID.profile.username)).toHaveTextContent('mifos');
    expect(screen.getByTestId(TID.profile.displayName)).toHaveTextContent('App Administrator');
    expect(screen.getByTestId(TID.profile.office)).toHaveTextContent('Head Office (1)');
    expect(screen.getByTestId(TID.profile.email)).toHaveTextContent('demomfi@mifos.org');
    expect(screen.getByTestId(TID.profile.roles)).toHaveTextContent('Super user');
    expect(profileApi.get).toHaveBeenCalledWith(1);
  });

  it('shows a failed read with a retry that reads again', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new AppError('server', 500, null, []))
      .mockResolvedValue(MIFOS);
    await render(api({ get }));
    await userEvent.click(await screen.findByTestId(TID.state.retry));
    expect(await screen.findByTestId(TID.profile.username)).toHaveTextContent('mifos');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('saves only matching passwords, shows the policy, and says when it is done', async () => {
    const { profileApi } = await render();
    await screen.findByTestId(TID.profile.username);
    const toggle = screen.getByTestId(TID.profile.changePassword);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const { password, repeat, save } = await openForm();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByTestId(TID.profile.policy)).toHaveTextContent(
      'PROFILE.PASSWORD_POLICY(policy=At least 6 characters)',
    );
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.type(password, 'secret-1');
    await userEvent.type(repeat, 'secret-2');
    expect(screen.getByTestId(TID.profile.mismatch)).toBeInTheDocument();
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.clear(repeat);
    await userEvent.type(repeat, 'secret-1');
    expect(screen.queryByTestId(TID.profile.mismatch)).not.toBeInTheDocument();
    await userEvent.click(save);
    expect(await screen.findByTestId(TID.profile.notice)).toBeInTheDocument();
    expect(screen.queryByTestId(TID.profile.newPassword)).not.toBeInTheDocument();
    expect(profileApi.changePassword).toHaveBeenCalledWith(1, {
      password: 'secret-1',
      repeatPassword: 'secret-1',
    });
  });

  it("shows the server's refusal in the open form; Cancel closes and forgets it", async () => {
    const refusal = new AppError('validation', 400, 'Validation errors exist.', [
      { field: 'password', message: 'Too short' },
    ]);
    await render(
      api({
        changePassword: vi.fn().mockRejectedValue(refusal),
        passwordPolicy: vi.fn().mockRejectedValue(refusal),
      }),
    );
    await screen.findByTestId(TID.profile.username);
    const { password, repeat, save } = await openForm();
    await userEvent.type(password, 'abc');
    await userEvent.type(repeat, 'abc');
    await userEvent.click(save);
    expect(await screen.findByTestId(TID.profile.error)).toHaveTextContent('Too short');
    expect(screen.getByTestId(TID.profile.newPassword)).toHaveValue('abc');
    expect(screen.queryByTestId(TID.profile.policy)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId(TID.profile.cancel));
    expect(screen.queryByTestId(TID.profile.newPassword)).not.toBeInTheDocument();
    const again = await openForm();
    expect(again.password).toHaveValue('');
    expect(screen.queryByTestId(TID.profile.error)).not.toBeInTheDocument();
  });
});
