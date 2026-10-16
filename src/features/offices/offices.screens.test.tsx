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
import { mapOffice, type OfficePayload } from '@/core/adapters/api/http-office.api';
import { OFFICE_API, type OfficeApi } from '@/core/adapters/api/office.api';
import { provide } from '@/core/adapters/registry';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import offices from '@/testing/fixtures/backend/offices.list.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock, routerCalls } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { OfficeFormScreen } from './OfficeFormScreen';
import { OfficesListScreen } from './OfficesListScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const OFFICES = (offices as OfficePayload[]).map(mapOffice);

function api(overrides: Partial<OfficeApi> = {}): OfficeApi {
  return {
    list: vi.fn(async () => OFFICES),
    get: vi.fn(async (id: number) => OFFICES.find((o) => o.id === id)!),
    create: vi.fn(async () => 7),
    update: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function render(ui: React.ReactElement, permissions: string[], officeApi = api()) {
  const view = renderWithAdapters(ui, { adapters: [provide(OFFICE_API, officeApi)] });
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return { ...view, officeApi };
}

describe('OfficesListScreen', () => {
  beforeEach(resetRouterMock);

  it('offers "New office" only with CREATE_OFFICE, and filters by name', async () => {
    const { unmount } = await render(<OfficesListScreen />, ['READ_OFFICE']);
    expect(await screen.findByTestId(TID.offices.row(2))).toBeInTheDocument();
    expect(screen.queryByTestId(TID.offices.create)).not.toBeInTheDocument();
    await userEvent.type(screen.getByTestId(TID.offices.search), 'KAMP');
    expect(screen.queryByTestId(TID.offices.row(1))).not.toBeInTheDocument();
    expect(screen.getByTestId(TID.offices.row(2))).toBeInTheDocument();
    unmount();
    await render(<OfficesListScreen />, ['READ_OFFICE', 'CREATE_OFFICE']);
    await userEvent.click(await screen.findByTestId(TID.offices.create));
    expect(routerCalls.push).toEqual(['/organization/offices/new']);
  });

  it('shows a load failure with a retry that reads again', async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new AppError('server', 500, null, []))
      .mockResolvedValue(OFFICES);
    await render(<OfficesListScreen />, ['READ_OFFICE'], api({ list }));
    await userEvent.click(await screen.findByTestId(TID.state.retry));
    expect(await screen.findByTestId(TID.offices.row(1))).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('OfficeFormScreen', () => {
  beforeEach(resetRouterMock);

  it('creates under the default head office with the typed fields, then opens the office', async () => {
    const { officeApi } = await render(<OfficeFormScreen />, ['ALL_FUNCTIONS']);
    const submit = await screen.findByTestId(TID.officeForm.submit);
    expect(screen.getByTestId(TID.officeForm.parent)).toHaveTextContent('Head Office');
    expect(screen.getByTestId(TID.officeForm.openingDate)).toHaveValue('2026-01-15');
    await userEvent.type(screen.getByTestId(TID.officeForm.name), 'Gulu');
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-disabled', 'true'));
    await userEvent.click(submit);
    await waitFor(() => expect(routerCalls.replace).toEqual(['/organization/offices/7']));
    expect(officeApi.create).toHaveBeenCalledWith({
      name: 'Gulu',
      parentId: 1,
      openingDate: '2026-01-15',
      externalId: null,
    });
  });

  it('shows a server field error under its field and a field-less one above the form', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(
        new AppError('validation', 400, 'x', [{ field: 'name', message: 'already exists' }]),
      )
      .mockRejectedValueOnce(new AppError('domainRule', 403, 'Opening date is in the future', []));
    await render(<OfficeFormScreen />, ['ALL_FUNCTIONS'], api({ create }));
    await userEvent.type(await screen.findByTestId(TID.officeForm.name), 'Head Office');
    const submit = screen.getByTestId(TID.officeForm.submit);
    await userEvent.click(submit);
    expect(await screen.findByTestId(TID.fieldError(TID.officeForm.name))).toHaveTextContent(
      'already exists',
    );
    await userEvent.click(submit);
    expect(await screen.findByTestId(TID.officeForm.error)).toHaveTextContent('in the future');
    expect(routerCalls.replace).toEqual([]);
  });

  it('edits without the parent, which it shows read-only', async () => {
    const { officeApi } = await render(<OfficeFormScreen officeId={2} />, ['ALL_FUNCTIONS']);
    const name = await screen.findByTestId(TID.officeForm.name);
    expect(screen.getByTestId(TID.officeForm.parent)).toHaveAttribute('aria-disabled', 'true');
    await userEvent.clear(name);
    await userEvent.type(name, 'Kampala Main');
    await userEvent.click(screen.getByTestId(TID.officeForm.submit));
    await waitFor(() => expect(routerCalls.dismissTo).toEqual(['/organization/offices/2']));
    expect(officeApi.update).toHaveBeenCalledWith(2, {
      name: 'Kampala Main',
      openingDate: '2026-10-02',
      externalId: null,
    });
  });
});
