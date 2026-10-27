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
import { AppError } from '@/core/http/app-error';
import { mapOffice, type OfficePayload } from '@/core/adapters/api/http-office.api';
import { OFFICE_API } from '@/core/adapters/api/office.api';
import { provide } from '@/core/adapters/registry';
import captured from '@/testing/fixtures/backend/authentication.json';
import page from '@/testing/fixtures/backend/clients.page.json';
import offices from '@/testing/fixtures/backend/offices.list.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock, routerCalls, searchParams } from '@/testing/router-mock';

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
    command: vi.fn(async () => undefined),
    reasons: vi.fn(async () => [
      { id: 51, name: 'Relocated' },
      { id: 52, name: 'Deceased' },
    ]),
    staffOptions: vi.fn(async () => [
      { id: 1, name: 'Director, Program' },
      { id: 4, name: 'Officer, Probe' },
    ]),
    assignStaff: vi.fn(async () => undefined),
    unassignStaff: vi.fn(async () => undefined),
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

  it('keeps the page in the URL; First and Last disable at the ends', async () => {
    const { api } = await render(<ClientsListScreen />, ['READ_CLIENT']);
    await screen.findByTestId(TID.clients.row(3));
    expect(screen.getByTestId(TID.clients.first)).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByTestId(TID.clients.last));
    expect(routerCalls.setParams).toEqual([{ page: '3', q: undefined }]);
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ offset: 40, limit: 20 }));
    expect(screen.getByTestId(TID.clients.last)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId(TID.clients.next)).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByTestId(TID.clients.first));
    expect(searchParams).toEqual({});
  });

  it('opens at the page and search in the URL, and moves a page past the end to the last', async () => {
    searchParams.page = '9';
    searchParams.q = 'ada';
    const { api } = await render(<ClientsListScreen />, ['READ_CLIENT']);
    expect(screen.getByTestId(TID.clients.search)).toHaveValue('ada');
    expect(api.list).toHaveBeenCalledWith({ offset: 160, limit: 20, search: 'ada' });
    await waitFor(() => expect(searchParams).toEqual({ page: '3', q: 'ada' }));
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({ offset: 40, limit: 20, search: 'ada' }),
    );
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
  const ACTIVE = CLIENTS.find((c) => c.id === 3)!;
  const action = (command: string) => screen.queryByTestId(TID.client.action(command));

  it('offers Activate for a pending client to who may, and activates on today', async () => {
    const { api } = await render(<ClientViewScreen clientId={7} />, [
      'READ_CLIENT',
      'ACTIVATE_CLIENT',
    ]);
    await userEvent.click(await screen.findByTestId(TID.client.action('activate')));
    expect(screen.getByTestId(TID.client.actionDate)).toHaveValue('2026-01-15');
    expect(screen.queryByTestId(TID.client.actionReason)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId(TID.client.actionConfirm));
    await waitFor(() =>
      expect(api.command).toHaveBeenCalledWith(7, 'activate', {
        date: '2026-01-15',
        reasonId: null,
      }),
    );
  });

  it('offers each action by status and by permission', async () => {
    await render(<ClientViewScreen clientId={7} />, ['READ_CLIENT', 'REJECT_CLIENT']);
    expect(await screen.findByTestId(TID.client.action('reject'))).toBeInTheDocument();
    expect(action('activate')).not.toBeInTheDocument();
    expect(action('withdraw')).not.toBeInTheDocument();
  });

  it('offers only Close for an active client', async () => {
    await render(<ClientViewScreen clientId={3} />, ['ALL_FUNCTIONS']);
    expect(await screen.findByTestId(TID.client.action('close'))).toBeInTheDocument();
    expect(action('activate')).not.toBeInTheDocument();
  });

  it('offers nothing to a reader', async () => {
    await render(<ClientViewScreen clientId={7} />, ['READ_CLIENT']);
    expect(await screen.findByTestId(TID.client.status)).toHaveTextContent(
      'CLIENTS.STATUS.PENDING',
    );
    expect(action('activate')).not.toBeInTheDocument();
    expect(action('reject')).not.toBeInTheDocument();
  });

  it('needs a reason before a reasoned command confirms, and sends it', async () => {
    const { api } = await render(<ClientViewScreen clientId={3} />, ['ALL_FUNCTIONS']);
    await userEvent.click(await screen.findByTestId(TID.client.action('close')));
    expect(api.reasons).toHaveBeenCalledWith('close');
    const confirm = screen.getByTestId(TID.client.actionConfirm);
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(await screen.findByTestId(TID.client.actionReason));
    await userEvent.click(screen.getByTestId(TID.option(TID.client.actionReason, 52)));
    expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.clear(screen.getByTestId(TID.client.actionDate));
    await userEvent.type(screen.getByTestId(TID.client.actionDate), '2026-02-30');
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    await userEvent.clear(screen.getByTestId(TID.client.actionDate));
    await userEvent.type(screen.getByTestId(TID.client.actionDate), '2026-02-28');
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(api.command).toHaveBeenCalledWith(3, 'close', { date: '2026-02-28', reasonId: 52 }),
    );
  });

  it('names the code to fill when no reasons are set up', async () => {
    const api = clientApi({ reasons: vi.fn(async () => []) });
    await render(<ClientViewScreen clientId={7} />, ['ALL_FUNCTIONS'], api);
    await userEvent.click(await screen.findByTestId(TID.client.action('withdraw')));
    expect(await screen.findByTestId(TID.client.actionNoReasons)).toHaveTextContent(
      'CLIENTS.ACTIONS.NO_REASONS',
    );
    expect(screen.getByTestId(TID.client.actionConfirm)).toHaveAttribute('aria-disabled', 'true');
  });

  it('cancel closes the panel and sends nothing', async () => {
    const { api } = await render(<ClientViewScreen clientId={3} />, ['ALL_FUNCTIONS']);
    await userEvent.click(await screen.findByTestId(TID.client.action('close')));
    await userEvent.click(screen.getByTestId(TID.client.actionCancel));
    expect(screen.queryByTestId(TID.client.actionConfirm)).not.toBeInTheDocument();
    expect(action('close')).toBeInTheDocument();
    expect(api.command).not.toHaveBeenCalled();
  });

  it("keeps the panel and shows the server's refusal, and reloads the client", async () => {
    const refusal = new AppError('domainRule', 403, 'Open loans.', [
      { field: 'id', message: 'Client cannot be closed because of non-closed loans.' },
    ]);
    const api = clientApi({
      command: vi.fn(async () => {
        throw refusal;
      }),
    });
    await render(<ClientViewScreen clientId={3} />, ['ALL_FUNCTIONS'], api);
    await userEvent.click(await screen.findByTestId(TID.client.action('close')));
    await userEvent.click(await screen.findByTestId(TID.client.actionReason));
    await userEvent.click(screen.getByTestId(TID.option(TID.client.actionReason, 51)));
    const reloads = vi.mocked(api.get).mock.calls.length;
    await userEvent.click(screen.getByTestId(TID.client.actionConfirm));
    expect(await screen.findByTestId(TID.client.actionError)).toHaveTextContent(
      'Client cannot be closed because of non-closed loans.',
    );
    expect(screen.getByTestId(TID.client.actionReason)).toHaveTextContent('Relocated');
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(reloads));
  });

  it('shows the closure date of a closed client, and offers Reactivate', async () => {
    const closed: Client = { ...ACTIVE, status: 'closed', closedOnDate: '2026-09-30' };
    const api = clientApi({ get: vi.fn(async () => closed) });
    await render(<ClientViewScreen clientId={3} />, ['ALL_FUNCTIONS'], api);
    expect(await screen.findByTestId(TID.client.closedOn)).toHaveTextContent('2026-09-30');
    expect(action('reactivate')).toBeInTheDocument();
  });

  it('assigns a member of staff from the office template', async () => {
    const pending = { ...PENDING, officeId: 1 };
    const api = clientApi({ get: vi.fn(async () => pending) });
    await render(<ClientViewScreen clientId={7} />, ['READ_CLIENT', 'ASSIGNSTAFF_CLIENT'], api);
    expect(screen.queryByTestId(TID.client.staff)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.client.unassignStaff)).not.toBeInTheDocument();
    await userEvent.click(await screen.findByTestId(TID.client.assignStaff));
    expect(api.staffOptions).toHaveBeenCalledWith(1);
    const confirm = screen.getByTestId(TID.client.staffConfirm);
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(await screen.findByTestId(TID.client.staffSelect));
    await userEvent.click(screen.getByTestId(TID.option(TID.client.staffSelect, 4)));
    await userEvent.click(confirm);
    await waitFor(() => expect(api.assignStaff).toHaveBeenCalledWith(7, 4));
  });

  it('unassigns the current officer once confirmed', async () => {
    const assigned: Client = { ...ACTIVE, staffId: 1, staffName: 'Director, Program' };
    const api = clientApi({ get: vi.fn(async () => assigned) });
    await render(<ClientViewScreen clientId={3} />, ['READ_CLIENT', 'UNASSIGNSTAFF_CLIENT'], api);
    expect(await screen.findByTestId(TID.client.staff)).toHaveTextContent('Director, Program');
    expect(screen.queryByTestId(TID.client.assignStaff)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId(TID.client.unassignStaff));
    await userEvent.click(screen.getByTestId(TID.client.unassignCancel));
    expect(api.unassignStaff).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId(TID.client.unassignStaff));
    await userEvent.click(screen.getByTestId(TID.client.unassignConfirm));
    await waitFor(() => expect(api.unassignStaff).toHaveBeenCalledWith(3, 1));
  });

  it('says when there is no staff to assign', async () => {
    const api = clientApi({ staffOptions: vi.fn(async () => []) });
    await render(<ClientViewScreen clientId={3} />, ['ALL_FUNCTIONS'], api);
    await userEvent.click(await screen.findByTestId(TID.client.assignStaff));
    expect(await screen.findByTestId(TID.client.staffNone)).toBeInTheDocument();
    expect(screen.getByTestId(TID.client.staffConfirm)).toHaveAttribute('aria-disabled', 'true');
  });

  it('offers no staff change for a closed client', async () => {
    const closed: Client = { ...ACTIVE, status: 'closed', staffId: 1, staffName: 'Director' };
    await render(
      <ClientViewScreen clientId={3} />,
      ['ALL_FUNCTIONS'],
      clientApi({ get: vi.fn(async () => closed) }),
    );
    expect(await screen.findByTestId(TID.client.staff)).toHaveTextContent('Director');
    expect(screen.queryByTestId(TID.client.assignStaff)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.client.unassignStaff)).not.toBeInTheDocument();
  });
});
