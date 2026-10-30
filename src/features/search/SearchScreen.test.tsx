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
import { provide } from '@/core/adapters/registry';
import { SEARCH_API, type SearchApi } from '@/core/adapters/api/search.api';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock, routerCalls } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { SearchScreen } from './SearchScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const ADA = { id: 11, type: 'client' as const, name: 'Ada', accountNo: '011', officeName: 'HQ' };

async function render(permissions: string[], search: SearchApi['search']) {
  const api: SearchApi = { search: vi.fn(search) };
  const view = renderWithAdapters(<SearchScreen />, { adapters: [provide(SEARCH_API, api)] });
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return { ...view, api };
}

describe('SearchScreen', () => {
  beforeEach(resetRouterMock);

  it('waits for two characters, then searches once the typing settles', async () => {
    const { api } = await render(['ALL_FUNCTIONS'], async () => [ADA]);
    await userEvent.type(screen.getByTestId(TID.search.query), 'A');
    expect(screen.getByTestId(TID.search.hint)).toBeInTheDocument();
    await userEvent.type(screen.getByTestId(TID.search.query), 'da');
    expect(await screen.findByTestId(TID.search.result('client', 11))).toHaveTextContent('Ada');
    expect(api.search).toHaveBeenCalledTimes(1);
    expect(api.search).toHaveBeenCalledWith('Ada');
    await userEvent.click(screen.getByTestId(TID.search.result('client', 11)));
    expect(routerCalls.push).toContain('/clients/11');
  });

  it('offers permitted screens as shortcuts, even when the record search fails', async () => {
    await render(['READ_CLIENT'], async () => {
      throw new AppError('server', 500, null, []);
    });
    await userEvent.type(screen.getByTestId(TID.search.query), 'NAV.CLIENTS');
    expect(await screen.findByTestId(TID.search.shortcut('clients'))).toBeInTheDocument();
    expect(await screen.findByTestId(TID.search.failed)).toBeInTheDocument();
    expect(screen.queryByTestId(TID.search.empty)).toBeNull();
  });

  it('says when nothing matches', async () => {
    await render(['READ_CLIENT'], async () => []);
    await userEvent.type(screen.getByTestId(TID.search.query), 'Zzz');
    expect(await screen.findByTestId(TID.search.empty)).toBeInTheDocument();
  });
});
