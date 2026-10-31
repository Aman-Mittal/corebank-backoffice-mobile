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

import { mapSession } from '@/core/adapters/api/http-auth.api';
import { provide } from '@/core/adapters/registry';
import { Can, useGranted, usePermission } from '@/core/auth/usePermission';
import { createDeploymentConfigStore, DEPLOYMENT_CONFIG } from '@/core/config/deployment-config';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import { renderWithAdapters } from '@/testing/render';

import { TID } from '../../e2e/shared/testids';
import { RequireAccess } from './RequireAccess';
import { ErrorState } from './ScreenState';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const clerk = mapSession({ ...captured, permissions: ['READ_CLIENT'] }, 'default');

function Probe() {
  return <span data-testid="probe">{String(usePermission({ anyOf: ['READ_CLIENT'] }))}</span>;
}

describe('usePermission / Can / RequireAccess', () => {
  it('re-renders when the session changes', async () => {
    const { fakes } = renderWithAdapters(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('false');
    await act(() => fakes.session.signIn(clerk));
    expect(screen.getByTestId('probe')).toHaveTextContent('true');
  });

  it('Can renders children when allowed and the fallback otherwise', async () => {
    const { fakes } = renderWithAdapters(
      <>
        <Can access={{ anyOf: ['READ_CLIENT'] }}>
          <span>clients</span>
        </Can>
        <Can access={{ anyOf: ['READ_USER'] }} fallback={<span>no users</span>}>
          <span>users</span>
        </Can>
      </>,
    );
    await act(() => fakes.session.signIn(clerk));
    expect(screen.getByText('clients')).toBeInTheDocument();
    expect(screen.queryByText('users')).not.toBeInTheDocument();
    expect(screen.getByText('no users')).toBeInTheDocument();
  });

  it('RequireAccess renders the screen when admitted, and Access Denied naming the codes otherwise', async () => {
    const { fakes } = renderWithAdapters(
      <>
        <RequireAccess access={{ anyOf: ['READ_CLIENT'] }}>
          <span>clients screen</span>
        </RequireAccess>
        <RequireAccess access={{ allOf: ['READ_USER', 'READ_ROLE'] }}>
          <span>security screen</span>
        </RequireAccess>
      </>,
    );
    await act(() => fakes.session.signIn(clerk));
    expect(screen.getByText('clients screen')).toBeInTheDocument();
    expect(screen.queryByText('security screen')).not.toBeInTheDocument();
    expect(screen.getByTestId(TID.accessDenied.required)).toHaveTextContent(
      'ACCESS_DENIED.REQUIRED_ALL(codes=READ_USER, READ_ROLE)',
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('RequireAccess with no requirement always renders', () => {
    renderWithAdapters(
      <RequireAccess access={null}>
        <span>open</span>
      </RequireAccess>,
    );
    expect(screen.getByText('open')).toBeInTheDocument();
  });
});

describe('client-side gates switched off', () => {
  async function gatesOff() {
    const config = createDeploymentConfigStore(async () => ({ rbacEnabled: false }));
    await config.load();
    return provide(DEPLOYMENT_CONFIG, config);
  }

  function Granted() {
    return <span data-testid="granted">{useGranted().join(',')}</span>;
  }

  it('admits every screen and control, and grants all functions', async () => {
    const { fakes } = renderWithAdapters(
      <>
        <Granted />
        <Can access={{ anyOf: ['READ_USER'] }}>
          <span>users</span>
        </Can>
        <RequireAccess access={{ allOf: ['READ_USER', 'READ_ROLE'] }}>
          <span>security screen</span>
        </RequireAccess>
      </>,
      { adapters: [await gatesOff()] },
    );
    await act(() => fakes.session.signIn(clerk));
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('security screen')).toBeInTheDocument();
    expect(screen.getByTestId('granted')).toHaveTextContent('ALL_FUNCTIONS');
  });
});

describe('ErrorState', () => {
  it('says a refused read is beyond the role, with no retry that cannot succeed', () => {
    renderWithAdapters(
      <ErrorState error={new AppError('forbidden', 403, null, [])} onRetry={() => undefined} />,
    );
    expect(screen.getByTestId(TID.state.error)).toHaveTextContent('STATE.REFUSED');
    expect(screen.queryByTestId(TID.state.retry)).toBeNull();
  });

  it('keeps the retry for a server failure and a lost connection', () => {
    renderWithAdapters(
      <>
        <ErrorState error={new AppError('server', 500, null, [])} onRetry={() => undefined} />
        <ErrorState error={new AppError('network', 0, null, [])} onRetry={() => undefined} />
      </>,
    );
    expect(screen.getAllByTestId(TID.state.retry)).toHaveLength(2);
  });
});
