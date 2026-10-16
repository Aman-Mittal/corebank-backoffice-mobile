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

import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mapSession } from '@/core/adapters/api/http-auth.api';
import captured from '@/testing/fixtures/backend/authentication.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock, routerCalls } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { AppShell } from './AppShell';

vi.mock('expo-router', async () => ({
  ...(await import('@/testing/router-mock')).expoRouterMock,
  usePathname: () => '/home',
}));

let width = 390;
vi.mock('react-native', async () => {
  const rnw = await vi.importActual<typeof import('react-native')>('react-native-web');
  return { ...rnw, useWindowDimensions: () => ({ width, height: 800, scale: 1, fontScale: 1 }) };
});

async function render(permissions: string[]) {
  const view = renderWithAdapters(
    <AppShell>
      <span>content</span>
    </AppShell>,
  );
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return view;
}

describe('AppShell', () => {
  beforeEach(() => {
    resetRouterMock();
    width = 390;
  });

  it('narrow: the drawer is not rendered until opened, then is a modal dialog holding focus', async () => {
    await render(['ALL_FUNCTIONS']);
    expect(screen.queryByTestId(TID.shell.drawer)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId(TID.shell.menuButton));
    const drawer = screen.getByTestId(TID.shell.drawer);
    expect(drawer).toHaveAttribute('role', 'dialog');
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId(TID.shell.drawerClose)).toHaveFocus();
  });

  it('narrow: Escape and the backdrop close the drawer', async () => {
    await render(['ALL_FUNCTIONS']);
    await userEvent.click(screen.getByTestId(TID.shell.menuButton));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId(TID.shell.drawer)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId(TID.shell.menuButton));
    await userEvent.click(screen.getByTestId(TID.shell.backdrop));
    expect(screen.queryByTestId(TID.shell.drawer)).not.toBeInTheDocument();
  });

  it('narrow: choosing an entry navigates and closes the drawer', async () => {
    await render(['READ_CLIENT']);
    await userEvent.click(screen.getByTestId(TID.shell.menuButton));
    await userEvent.click(screen.getByTestId(TID.shell.navItem('clients')));
    expect(routerCalls.push).toEqual(['/clients']);
    expect(screen.queryByTestId(TID.shell.drawer)).not.toBeInTheDocument();
  });

  it('wide: a permanent sidebar with only the permitted navigation, and no menu button', async () => {
    width = 1280;
    await render(['READ_CLIENT']);
    expect(screen.getByTestId(TID.shell.sidebar)).toBeInTheDocument();
    expect(screen.queryByTestId(TID.shell.menuButton)).not.toBeInTheDocument();
    expect(screen.getByTestId(TID.shell.navItem('clients'))).toBeInTheDocument();
    expect(screen.queryByTestId(TID.shell.navGroup('security'))).not.toBeInTheDocument();
  });

  it('a group toggles its entries and reports aria-expanded', async () => {
    width = 1280;
    await render(['ALL_FUNCTIONS']);
    const group = screen.getByTestId(TID.shell.navGroup('security'));
    expect(group).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId(TID.shell.navItem('security.users'))).toBeVisible();
  });

  it('signs out from the shell', async () => {
    const { fakes } = await render(['ALL_FUNCTIONS']);
    await userEvent.click(screen.getByTestId(TID.shell.signOut));
    expect(fakes.session.getState().status).toBe('signedOut');
  });
});
