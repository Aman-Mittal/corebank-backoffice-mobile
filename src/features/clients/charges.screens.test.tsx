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

import {
  CLIENT_CHARGE_API,
  type ClientCharge,
  type ClientChargeApi,
} from '@/core/adapters/api/client-charge.api';
import { CLIENT_API, type Client, type ClientApi } from '@/core/adapters/api/client.api';
import { mapSession } from '@/core/adapters/api/http-auth.api';
import { mapClient, type ClientPayload } from '@/core/adapters/api/http-client.api';
import { provide } from '@/core/adapters/registry';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import page from '@/testing/fixtures/backend/clients.page.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { ClientChargesScreen } from './ClientChargesScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const ACTIVE: Client = { ...(page.pageItems as ClientPayload[]).map(mapClient)[0]!, id: 3 };
const USD = { code: 'USD', decimalPlaces: 2 };
const charge = (over: Partial<ClientCharge>): ClientCharge => ({
  id: 1,
  chargeId: 1,
  name: 'Membership fee',
  penalty: false,
  dueDate: '2026-02-15',
  currency: USD,
  amount: 100,
  amountPaid: 0,
  amountWaived: 0,
  amountOutstanding: 100,
  status: 'outstanding',
  ...over,
});
const CHARGES = [
  charge({ id: 1 }),
  charge({ id: 2, amountPaid: 30, amountOutstanding: 70 }),
  charge({ id: 3, amountWaived: 100, amountOutstanding: 0, status: 'waived' }),
];

function chargeApi(overrides: Partial<ClientChargeApi> = {}): ClientChargeApi {
  return {
    charges: vi.fn(async () => CHARGES),
    chargeOptions: vi.fn(async () => [
      { id: 1, name: 'Membership fee', amount: 100, penalty: false, currency: USD },
      { id: 2, name: 'Late payment penalty', amount: 25.5, penalty: true, currency: USD },
    ]),
    addCharge: vi.fn(async () => 9),
    payCharge: vi.fn(async () => undefined),
    waiveCharge: vi.fn(async () => undefined),
    deleteCharge: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function render(permissions: string[], api = chargeApi(), client: Client = ACTIVE) {
  const clientApi = { get: vi.fn(async () => client) } as unknown as ClientApi;
  const view = renderWithAdapters(<ClientChargesScreen clientId={3} />, {
    adapters: [provide(CLIENT_CHARGE_API, api), provide(CLIENT_API, clientApi)],
  });
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return { ...view, api };
}

const ALL = [
  'READ_CLIENTCHARGE',
  'CREATE_CLIENTCHARGE',
  'PAY_CLIENTCHARGE',
  'WAIVE_CLIENTCHARGE',
  'DELETE_CLIENTCHARGE',
];

describe('ClientChargesScreen', () => {
  beforeEach(resetRouterMock);

  it("offers each action only by permission and the charge's state", async () => {
    await render(ALL);
    expect(await screen.findByTestId(TID.charges.add)).toBeInTheDocument();
    expect(screen.getByTestId(TID.charges.remove(1))).toBeInTheDocument();
    // Part-paid: payable and waivable, no longer deletable.
    expect(screen.getByTestId(TID.charges.pay(2))).toBeInTheDocument();
    expect(screen.queryByTestId(TID.charges.remove(2))).not.toBeInTheDocument();
    // Waived: nothing more to do.
    expect(screen.getByTestId(TID.charges.status(3))).toHaveTextContent('CHARGES.STATUS.WAIVED');
    expect(screen.queryByTestId(TID.charges.pay(3))).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.charges.waive(3))).not.toBeInTheDocument();
  });

  it('offers a reader nothing but the list', async () => {
    await render(['READ_CLIENTCHARGE']);
    expect(await screen.findByTestId(TID.charges.row(1))).toBeInTheDocument();
    expect(screen.queryByTestId(TID.charges.add)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.charges.pay(1))).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.charges.remove(1))).not.toBeInTheDocument();
  });

  it('keeps Add from a pending client', async () => {
    await render(ALL, chargeApi(), { ...ACTIVE, status: 'pending' });
    expect(await screen.findByTestId(TID.charges.row(1))).toBeInTheDocument();
    expect(screen.queryByTestId(TID.charges.add)).not.toBeInTheDocument();
  });

  it('shows amount and due date once a charge is chosen, starting at its amount', async () => {
    const { api } = await render(ALL);
    await userEvent.click(await screen.findByTestId(TID.charges.add));
    expect(screen.queryByTestId(TID.chargeForm.amount)).not.toBeInTheDocument();
    const save = screen.getByTestId(TID.chargeForm.submit);
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByTestId(TID.chargeForm.charge));
    await userEvent.click(await screen.findByTestId(TID.option(TID.chargeForm.charge, 2)));
    expect(screen.getByTestId(TID.chargeForm.amount)).toHaveValue('25.5');
    expect(save).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.clear(screen.getByTestId(TID.chargeForm.amount));
    await userEvent.type(screen.getByTestId(TID.chargeForm.amount), '0');
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.type(screen.getByTestId(TID.chargeForm.amount), '.5');
    await userEvent.clear(screen.getByTestId(TID.chargeForm.dueDate));
    await userEvent.type(screen.getByTestId(TID.chargeForm.dueDate), '2026-11-15');
    await userEvent.click(save);
    await waitFor(() =>
      expect(api.addCharge).toHaveBeenCalledWith(3, {
        chargeId: 2,
        amount: 0.5,
        dueDate: '2026-11-15',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId(TID.chargeForm.submit)).not.toBeInTheDocument(),
    );
  });

  it('puts a refused due date under the due date, keeping what was typed', async () => {
    const refusal = new AppError('validation', 400, null, [
      { field: 'dueDate', message: 'dueDate.before.activationDate' },
    ]);
    await render(
      ALL,
      chargeApi({
        addCharge: vi.fn(async () => {
          throw refusal;
        }),
      }),
    );
    await userEvent.click(await screen.findByTestId(TID.charges.add));
    await userEvent.click(screen.getByTestId(TID.chargeForm.charge));
    await userEvent.click(await screen.findByTestId(TID.option(TID.chargeForm.charge, 1)));
    await userEvent.click(screen.getByTestId(TID.chargeForm.submit));
    expect(await screen.findByTestId(TID.fieldError(TID.chargeForm.dueDate))).toHaveTextContent(
      'dueDate.before.activationDate',
    );
    expect(screen.getByTestId(TID.chargeForm.amount)).toHaveValue('100');
  });

  it('pays the outstanding amount by default, and shows a refusal in the row', async () => {
    const refusal = new AppError('validation', 400, null, [
      { field: null, message: 'amount.paid.in.access' },
    ]);
    const api = chargeApi({
      payCharge: vi.fn().mockRejectedValueOnce(refusal).mockResolvedValueOnce(undefined),
    });
    await render(ALL, api);
    await userEvent.click(await screen.findByTestId(TID.charges.pay(2)));
    expect(screen.getByTestId(TID.charges.payAmount)).toHaveValue('70');
    await userEvent.click(screen.getByTestId(TID.charges.paySubmit));
    expect(await screen.findByTestId(TID.charges.rowError)).toHaveTextContent(
      'amount.paid.in.access',
    );
    await userEvent.click(screen.getByTestId(TID.charges.paySubmit));
    await waitFor(() => expect(api.payCharge).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.payCharge).mock.calls[1]![2]).toMatchObject({ amount: 70 });
    await waitFor(() =>
      expect(screen.queryByTestId(TID.charges.paySubmit)).not.toBeInTheDocument(),
    );
  });

  it('waives and deletes only once confirmed', async () => {
    const { api } = await render(ALL);
    await userEvent.click(await screen.findByTestId(TID.charges.waive(1)));
    await userEvent.click(screen.getByTestId(TID.charges.cancelConfirm));
    expect(api.waiveCharge).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId(TID.charges.waive(1)));
    await userEvent.click(screen.getByTestId(TID.charges.confirmWaive));
    await waitFor(() => expect(api.waiveCharge).toHaveBeenCalledWith(3, 1));
    await userEvent.click(await screen.findByTestId(TID.charges.remove(1)));
    await userEvent.click(screen.getByTestId(TID.charges.confirmRemove));
    await waitFor(() => expect(api.deleteCharge).toHaveBeenCalledWith(3, 1));
  });
});
