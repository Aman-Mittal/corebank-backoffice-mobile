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

import { CLIENT_API, type Client, type ClientApi } from '@/core/adapters/api/client.api';
import { mapSession } from '@/core/adapters/api/http-auth.api';
import { mapClient, type ClientPayload } from '@/core/adapters/api/http-client.api';
import { mapOffice, type OfficePayload } from '@/core/adapters/api/http-office.api';
import { OFFICE_API } from '@/core/adapters/api/office.api';
import { provide } from '@/core/adapters/registry';
import captured from '@/testing/fixtures/backend/authentication.json';
import page from '@/testing/fixtures/backend/clients.page.json';
import offices from '@/testing/fixtures/backend/offices.list.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock, routerCalls } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { ClientFormScreen } from './ClientFormScreen';
import { ClientsListScreen } from './ClientsListScreen';
import { ClientViewScreen } from './ClientViewScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const CLIENTS = (page.pageItems as ClientPayload[]).map(mapClient);
const OFFICES = (offices as OfficePayload[]).map(mapOffice);
const PENDING: Client = { ...CLIENTS[0]!, id: 7, status: 'pending', activationDate: null };

function clientApi(overrides: Partial<ClientApi> = {}): ClientApi {
  return {
    list: vi.fn(async () => ({ total: 45, items: CLIENTS })),
    get: vi.fn(async (id: number) => (id === 7 ? PENDING : CLIENTS.find((c) => c.id === id)!)),
    create: vi.fn(async () => 14),
    activate: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function render(ui: React.ReactElement, permissions: string[], api = clientApi()) {
  const view = renderWithAdapters(ui, {
    adapters: [
      provide(CLIENT_API, api),
      provide(OFFICE_API, {
        list: async () => OFFICES,
        get: async () => OFFICES[0]!,
        create: async () => 1,
        update: async () => undefined,
      }),
    ],
  });
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return { ...view, api };
}

describe('ClientsListScreen', () => {
  beforeEach(resetRouterMock);

  it('asks for the first page, pages forward, and offers create only with the permission', async () => {
    const { api } = await render(<ClientsListScreen />, ['READ_CLIENT']);
    expect(await screen.findByTestId(TID.clients.row(3))).toHaveTextContent(
      'CLIENTS.STATUS.ACTIVE',
    );
    expect(api.list).toHaveBeenLastCalledWith({ offset: 0, limit: 20 });
    expect(screen.getByTestId(TID.clients.previous)).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByTestId(TID.clients.next));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ offset: 20, limit: 20 }));
    expect(screen.queryByTestId(TID.clients.create)).not.toBeInTheDocument();
  });

  it('searches on the server once typing pauses, from the first page', async () => {
    const { api } = await render(<ClientsListScreen />, ['READ_CLIENT', 'CREATE_CLIENT']);
    await screen.findByTestId(TID.clients.row(3));
    expect(screen.getByTestId(TID.clients.create)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId(TID.clients.next));
    await userEvent.type(screen.getByTestId(TID.clients.search), 'ada');
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({ offset: 0, limit: 20, search: 'ada' }),
    );
    expect(api.list).not.toHaveBeenCalledWith(expect.objectContaining({ search: 'a' }));
  });

  it('says when there are no clients, and when none match', async () => {
    const api = clientApi({ list: vi.fn(async () => ({ total: 0, items: [] })) });
    await render(<ClientsListScreen />, ['READ_CLIENT'], api);
    expect(await screen.findByTestId(TID.state.empty)).toHaveTextContent('CLIENTS.EMPTY');
    await userEvent.type(screen.getByTestId(TID.clients.search), 'zzz');
    await waitFor(() =>
      expect(screen.getByTestId(TID.state.empty)).toHaveTextContent('CLIENTS.NO_MATCH'),
    );
  });
});

describe('ClientFormScreen', () => {
  beforeEach(resetRouterMock);

  it('swaps the name fields with the legal form, and creates an entity', async () => {
    const { api } = await render(<ClientFormScreen />, ['ALL_FUNCTIONS']);
    await userEvent.click(await screen.findByTestId(TID.clientForm.office));
    await userEvent.click(screen.getByTestId(TID.option(TID.clientForm.office, 1)));
    expect(screen.getByTestId(TID.clientForm.firstname)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId(TID.clientForm.legalForm));
    await userEvent.click(screen.getByTestId(TID.option(TID.clientForm.legalForm, 2)));
    expect(screen.queryByTestId(TID.clientForm.firstname)).not.toBeInTheDocument();
    await userEvent.type(screen.getByTestId(TID.clientForm.fullname), 'Acme');
    await userEvent.click(screen.getByTestId(TID.clientForm.active));
    expect(screen.queryByTestId(TID.clientForm.activationDate)).not.toBeInTheDocument();
    const submit = screen.getByTestId(TID.clientForm.submit);
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-disabled', 'true'));
    await userEvent.click(submit);
    await waitFor(() => expect(routerCalls.replace).toEqual(['/clients/14']));
    expect(api.create).toHaveBeenCalledWith({
      legalForm: 'entity',
      fullname: 'Acme',
      officeId: 1,
      submittedOnDate: '2026-01-15',
      active: false,
      externalId: null,
      mobileNo: null,
      emailAddress: null,
    });
  });
});

describe('ClientViewScreen', () => {
  it('offers Activate for a pending client to who may, and activates on today', async () => {
    const { api } = await render(<ClientViewScreen clientId={7} />, [
      'READ_CLIENT',
      'ACTIVATE_CLIENT',
    ]);
    await userEvent.click(await screen.findByTestId(TID.client.activate));
    expect(screen.getByTestId(TID.client.activateDate)).toHaveValue('2026-01-15');
    await userEvent.click(screen.getByTestId(TID.client.activateConfirm));
    await waitFor(() => expect(api.activate).toHaveBeenCalledWith(7, '2026-01-15'));
  });

  it('offers no Activate for an active client, nor without the permission', async () => {
    await render(<ClientViewScreen clientId={3} />, ['ALL_FUNCTIONS']);
    expect(await screen.findByTestId(TID.client.name)).toHaveTextContent('Arif Arif');
    expect(screen.queryByTestId(TID.client.activate)).not.toBeInTheDocument();
  });

  it('offers no Activate to a reader', async () => {
    await render(<ClientViewScreen clientId={7} />, ['READ_CLIENT']);
    expect(await screen.findByTestId(TID.client.status)).toHaveTextContent(
      'CLIENTS.STATUS.PENDING',
    );
    expect(screen.queryByTestId(TID.client.activate)).not.toBeInTheDocument();
  });
});
