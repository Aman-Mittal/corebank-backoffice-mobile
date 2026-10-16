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

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mapSession } from '@/core/adapters/api/http-auth.api';
import { TWO_FACTOR_API, type TwoFactorApi } from '@/core/adapters/api/two-factor.api';
import { provide } from '@/core/adapters/registry';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock, routerCalls } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { TwoFactorStep } from './TwoFactorStep';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const EMAIL = { name: 'email', target: 'a***@example.org' };
const SMS = { name: 'sms', target: '+1******89' };
const REFUSED = new AppError('domainRule', 403, 'Errors contain reason', [
  { field: null, message: 'The provided one time token is invalid' },
]);

async function setup(api: Partial<TwoFactorApi>) {
  const full: TwoFactorApi = {
    methods: vi.fn(async () => [EMAIL]),
    request: vi.fn(async () => undefined),
    validate: vi.fn(async () => 'tfa-1'),
    invalidate: vi.fn(async () => undefined),
    ...api,
  };
  const onBack = vi.fn();
  const view = renderWithAdapters(<TwoFactorStep onBack={onBack} />, {
    adapters: [provide(TWO_FACTOR_API, full)],
  });
  await act(() => view.fakes.session.beginTwoFactor(mapSession(captured, 'default')));
  return { ...view, api: full, onBack };
}

describe('TwoFactorStep', () => {
  beforeEach(resetRouterMock);

  it('shows a single channel without a choice, then completes with the right code', async () => {
    const user = userEvent.setup();
    const { fakes, api } = await setup({});
    expect(await screen.findByTestId(TID.twoFactor.target)).toHaveTextContent('a***@example.org');
    expect(screen.queryByTestId(TID.twoFactor.method('email'))).not.toBeInTheDocument();
    await user.click(screen.getByTestId(TID.twoFactor.send));
    expect(api.request).toHaveBeenCalledWith('email');
    await user.type(await screen.findByTestId(TID.twoFactor.code), ' NMKH4 ');
    await user.click(screen.getByTestId(TID.twoFactor.verify));
    await waitFor(() => expect(routerCalls.replace).toEqual(['/home']));
    expect(api.validate).toHaveBeenCalledWith('NMKH4');
    expect(fakes.session.getState()).toMatchObject({
      status: 'signedIn',
      session: { tfaToken: 'tfa-1' },
    });
  });

  it('offers a choice between several channels and sends the chosen one', async () => {
    const user = userEvent.setup();
    const { api } = await setup({ methods: vi.fn(async () => [EMAIL, SMS]) });
    await user.click(await screen.findByTestId(TID.twoFactor.method('sms')));
    expect(screen.getByTestId(TID.twoFactor.method('sms'))).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByTestId(TID.twoFactor.send));
    expect(api.request).toHaveBeenCalledWith('sms');
  });

  it('with no channel, says so and offers only the way back', async () => {
    const user = userEvent.setup();
    const { onBack } = await setup({ methods: vi.fn(async () => []) });
    expect(await screen.findByTestId(TID.twoFactor.noMethods)).toBeInTheDocument();
    expect(screen.queryByTestId(TID.twoFactor.send)).not.toBeInTheDocument();
    await user.click(screen.getByTestId(TID.twoFactor.back));
    expect(onBack).toHaveBeenCalled();
  });

  it('a wrong code clears the field and shows the server reason', async () => {
    const user = userEvent.setup();
    const { fakes } = await setup({
      validate: vi.fn(async () => {
        throw REFUSED;
      }),
    });
    await user.click(await screen.findByTestId(TID.twoFactor.send));
    await user.type(await screen.findByTestId(TID.twoFactor.code), 'WRONG');
    await user.click(screen.getByTestId(TID.twoFactor.verify));
    expect(await screen.findByTestId(TID.twoFactor.error)).toHaveTextContent(
      'one time token is invalid',
    );
    expect(screen.getByTestId(TID.twoFactor.code)).toHaveValue('');
    expect(fakes.session.getState().status).toBe('twoFactor');
  });

  it('a failed send stays on the choice with an error', async () => {
    const user = userEvent.setup();
    await setup({
      request: vi.fn(async () => {
        throw new AppError('server', 500, null, []);
      }),
    });
    await user.click(await screen.findByTestId(TID.twoFactor.send));
    expect(await screen.findByTestId(TID.twoFactor.error)).toHaveTextContent(
      'TWO_FACTOR.SEND_FAILED',
    );
    expect(screen.queryByTestId(TID.twoFactor.code)).not.toBeInTheDocument();
    expect(screen.getByTestId(TID.twoFactor.send)).toBeInTheDocument();
  });
});
