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
import { mapStaff, type StaffPayload } from '@/core/adapters/api/http-staff.api';
import { OFFICE_API } from '@/core/adapters/api/office.api';
import { STAFF_API, type StaffApi } from '@/core/adapters/api/staff.api';
import { provide } from '@/core/adapters/registry';
import captured from '@/testing/fixtures/backend/authentication.json';
import offices from '@/testing/fixtures/backend/offices.list.json';
import staff from '@/testing/fixtures/backend/staff.list.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock, routerCalls } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { StaffFormScreen } from './StaffFormScreen';
import { StaffListScreen } from './StaffListScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const STAFF = (staff as StaffPayload[]).map(mapStaff);
const OFFICES = (offices as OfficePayload[]).map(mapOffice);

function staffApi(overrides: Partial<StaffApi> = {}): StaffApi {
  return {
    list: vi.fn(async (q) =>
      q?.officeId ? STAFF.filter((s) => s.officeId === q.officeId) : STAFF,
    ),
    get: vi.fn(async (id: number) => STAFF.find((s) => s.id === id)!),
    create: vi.fn(async () => 3),
    update: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function render(
  ui: React.ReactElement,
  permissions: string[],
  api = staffApi(),
  officesOk = true,
) {
  const view = renderWithAdapters(ui, {
    adapters: [
      provide(STAFF_API, api),
      provide(OFFICE_API, {
        list: officesOk
          ? async () => OFFICES
          : async () => {
              throw new Error('403');
            },
        get: async () => OFFICES[0]!,
        create: async () => 1,
        update: async () => undefined,
      }),
    ],
  });
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return { ...view, api };
}

describe('StaffListScreen', () => {
  beforeEach(resetRouterMock);

  it('asks for every status, narrows by office through the request, and filters by name', async () => {
    const { api } = await render(<StaffListScreen />, ['READ_STAFF', 'READ_OFFICE']);
    expect(await screen.findByTestId(TID.staff.row(2))).toHaveTextContent('COMMON.INACTIVE');
    expect(api.list).toHaveBeenLastCalledWith({ status: 'all' });
    await userEvent.click(screen.getByTestId(TID.staff.officeFilter));
    await userEvent.click(screen.getByTestId(TID.option(TID.staff.officeFilter, 2)));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ status: 'all', officeId: 2 }));
    await waitFor(() => expect(screen.queryByTestId(TID.staff.row(1))).not.toBeInTheDocument());
    expect(screen.queryByTestId(TID.staff.create)).not.toBeInTheDocument();
  });

  it('hides the office filter when offices cannot be read, and says when there are no staff', async () => {
    await render(
      <StaffListScreen />,
      ['READ_STAFF'],
      staffApi({ list: vi.fn(async () => []) }),
      false,
    );
    expect(await screen.findByTestId(TID.state.empty)).toHaveTextContent('STAFF.EMPTY');
    expect(screen.queryByTestId(TID.staff.officeFilter)).not.toBeInTheDocument();
  });
});

describe('StaffFormScreen', () => {
  beforeEach(resetRouterMock);

  it('creates from the required fields with active on and loan officer off by default', async () => {
    const { api } = await render(<StaffFormScreen />, ['ALL_FUNCTIONS']);
    await userEvent.click(await screen.findByTestId(TID.staffForm.office));
    await userEvent.click(screen.getByTestId(TID.option(TID.staffForm.office, 1)));
    await userEvent.type(screen.getByTestId(TID.staffForm.firstname), 'Ada');
    await userEvent.type(screen.getByTestId(TID.staffForm.lastname), 'Lovelace');
    const submit = screen.getByTestId(TID.staffForm.submit);
    await waitFor(() => expect(submit).not.toHaveAttribute('aria-disabled', 'true'));
    await userEvent.click(submit);
    await waitFor(() => expect(routerCalls.replace).toEqual(['/organization/staff/3']));
    expect(api.create).toHaveBeenCalledWith({
      officeId: 1,
      firstname: 'Ada',
      lastname: 'Lovelace',
      mobileNo: null,
      emailAddress: null,
      externalId: null,
      isLoanOfficer: false,
      isActive: true,
      joiningDate: '2026-01-15',
    });
  });

  it('edits the editable fields, with office and joining date read-only', async () => {
    const { api } = await render(<StaffFormScreen staffId={2} />, ['ALL_FUNCTIONS']);
    const mobile = await screen.findByTestId(TID.staffForm.mobile);
    expect(screen.getByTestId(TID.staffForm.office)).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId(TID.staffForm.joiningDate)).toHaveAttribute('readonly');
    await userEvent.type(mobile, '0772');
    await userEvent.click(screen.getByTestId(TID.staffForm.active));
    await userEvent.click(screen.getByTestId(TID.staffForm.submit));
    await waitFor(() => expect(routerCalls.dismissTo).toEqual(['/organization/staff/2']));
    expect(api.update).toHaveBeenCalledWith(2, {
      firstname: 'Grace',
      lastname: 'Okello',
      mobileNo: '0772',
      externalId: null,
      isLoanOfficer: false,
      isActive: true,
    });
  });
});
