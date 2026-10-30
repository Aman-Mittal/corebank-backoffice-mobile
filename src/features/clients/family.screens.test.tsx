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
import { FAMILY_API, type FamilyApi, type FamilyMember } from '@/core/adapters/api/family.api';
import { provide } from '@/core/adapters/registry';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { FamilyMembersScreen, toFamilyDraft } from './FamilyMembersScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const TOM: FamilyMember = {
  id: 8,
  firstName: 'Tom',
  middleName: null,
  lastName: 'Lovelace',
  relationshipId: 27,
  relationship: 'Son',
  genderId: null,
  gender: null,
  maritalStatusId: null,
  maritalStatus: null,
  professionId: null,
  profession: null,
  qualification: null,
  mobileNumber: null,
  age: null,
  dateOfBirth: null,
  isDependent: true,
};

function familyApi(overrides: Partial<FamilyApi> = {}): FamilyApi {
  return {
    members: vi.fn(async () => [TOM]),
    options: vi.fn(async () => ({
      relationships: [
        { id: 26, name: 'Spouse' },
        { id: 27, name: 'Son' },
      ],
      genders: [{ id: 28, name: 'Female' }],
      maritalStatuses: [],
      professions: [],
    })),
    add: vi.fn(async () => 9),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function render(permissions: string[], api = familyApi()) {
  const view = renderWithAdapters(<FamilyMembersScreen clientId={1} />, {
    adapters: [provide(FAMILY_API, api)],
  });
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return { ...view, api };
}

const ALL = [
  'READ_FAMILYMEMBERS',
  'CREATE_FAMILYMEMBERS',
  'UPDATE_FAMILYMEMBERS',
  'DELETE_FAMILYMEMBERS',
];

describe('toFamilyDraft', () => {
  const base = {
    firstName: 'Tom',
    middleName: '',
    lastName: 'L',
    relationshipId: 27,
    genderId: null,
    maritalStatusId: null,
    professionId: null,
    qualification: '',
    mobileNumber: '',
    age: '',
    dateOfBirth: '',
    isDependent: false,
  };

  it('needs both names and a relationship, and a valid age and date when given', () => {
    expect(toFamilyDraft(base)).toMatchObject({ age: null, dateOfBirth: null });
    expect(toFamilyDraft({ ...base, lastName: ' ' })).toBeNull();
    expect(toFamilyDraft({ ...base, relationshipId: null })).toBeNull();
    expect(toFamilyDraft({ ...base, age: '9.5' })).toBeNull();
    expect(toFamilyDraft({ ...base, dateOfBirth: '2020-02-30' })).toBeNull();
    expect(toFamilyDraft({ ...base, age: ' 9 ', dateOfBirth: '2017-02-01' })).toMatchObject({
      age: 9,
      dateOfBirth: '2017-02-01',
    });
  });
});

describe('FamilyMembersScreen', () => {
  beforeEach(resetRouterMock);

  it('adds a member once both names and a relationship are given', async () => {
    const { api } = await render(ALL);
    await userEvent.click(await screen.findByTestId(TID.family.add));
    const save = screen.getByTestId(TID.familyForm.submit);
    await userEvent.type(screen.getByTestId(TID.familyForm.firstName), 'Mary');
    await userEvent.type(screen.getByTestId(TID.familyForm.lastName), 'Lovelace');
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByTestId(TID.familyForm.relationship));
    await userEvent.click(await screen.findByTestId(TID.option(TID.familyForm.relationship, 26)));
    expect(save).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(save);
    await waitFor(() =>
      expect(api.add).toHaveBeenCalledWith(1, expect.objectContaining({ relationshipId: 26 })),
    );
  });

  it("edits from the member's own values", async () => {
    const { api } = await render(ALL);
    await userEvent.click(await screen.findByTestId(TID.family.edit(8)));
    expect(screen.getByTestId(TID.familyForm.firstName)).toHaveValue('Tom');
    await userEvent.clear(screen.getByTestId(TID.familyForm.lastName));
    await userEvent.type(screen.getByTestId(TID.familyForm.lastName), 'Byron');
    await userEvent.click(screen.getByTestId(TID.familyForm.submit));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        1,
        8,
        expect.objectContaining({ firstName: 'Tom', lastName: 'Byron', isDependent: true }),
      ),
    );
  });

  it('puts a refused field under it, and deletes only once confirmed', async () => {
    const refusal = new AppError('validation', 400, null, [
      { field: 'mobileNumber', message: 'too long' },
    ]);
    const api = familyApi({
      add: vi.fn(async () => {
        throw refusal;
      }),
    });
    await render(ALL, api);
    await userEvent.click(await screen.findByTestId(TID.family.remove(8)));
    await userEvent.click(screen.getByTestId(TID.family.cancelRemove));
    expect(api.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId(TID.family.remove(8)));
    await userEvent.click(screen.getByTestId(TID.family.confirmRemove));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith(1, 8));

    await userEvent.click(screen.getByTestId(TID.family.add));
    await userEvent.type(screen.getByTestId(TID.familyForm.firstName), 'A');
    await userEvent.type(screen.getByTestId(TID.familyForm.lastName), 'B');
    await userEvent.click(screen.getByTestId(TID.familyForm.relationship));
    await userEvent.click(await screen.findByTestId(TID.option(TID.familyForm.relationship, 27)));
    await userEvent.click(screen.getByTestId(TID.familyForm.submit));
    expect(await screen.findByTestId(TID.fieldError(TID.familyForm.mobile))).toHaveTextContent(
      'too long',
    );
  });

  it('offers a reader nothing but the list', async () => {
    await render(['READ_FAMILYMEMBERS']);
    expect(await screen.findByTestId(TID.family.row(8))).toHaveTextContent('Tom Lovelace');
    expect(screen.queryByTestId(TID.family.add)).toBeNull();
    expect(screen.queryByTestId(TID.family.edit(8))).toBeNull();
  });

  it('cannot save when no relationships are set up', async () => {
    const api = familyApi({
      options: vi.fn(async () => ({
        relationships: [],
        genders: [],
        maritalStatuses: [],
        professions: [],
      })),
    });
    await render(ALL, api);
    await userEvent.click(await screen.findByTestId(TID.family.add));
    expect(await screen.findByTestId(TID.familyForm.noRelationships)).toBeInTheDocument();
    await userEvent.type(screen.getByTestId(TID.familyForm.firstName), 'A');
    await userEvent.type(screen.getByTestId(TID.familyForm.lastName), 'B');
    expect(screen.getByTestId(TID.familyForm.submit)).toHaveAttribute('aria-disabled', 'true');
  });
});
