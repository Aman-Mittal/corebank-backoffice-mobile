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
  CLIENT_KYC_API,
  type ClientKycApi,
  type ClientNote,
} from '@/core/adapters/api/client-kyc.api';
import { mapSession } from '@/core/adapters/api/http-auth.api';
import { provide } from '@/core/adapters/registry';
import { AppError } from '@/core/http/app-error';
import captured from '@/testing/fixtures/backend/authentication.json';
import { renderWithAdapters } from '@/testing/render';
import { resetRouterMock } from '@/testing/router-mock';

import { TID } from '../../../e2e/shared/testids';
import { ClientIdentifiersScreen } from './ClientIdentifiersScreen';
import { ClientNotesScreen, noteDay } from './ClientNotesScreen';

vi.mock('expo-router', async () => (await import('@/testing/router-mock')).expoRouterMock);

const NOTES: ClientNote[] = [
  { id: 2, note: 'Second', createdBy: 'clerk', createdOn: '2026-10-05T14:00:00Z' },
  { id: 1, note: 'First', createdBy: 'mifos', createdOn: '2026-10-01T09:30:00Z' },
];

function kycApi(overrides: Partial<ClientKycApi> = {}): ClientKycApi {
  return {
    identifiers: vi.fn(async () => [
      {
        id: 7,
        documentTypeId: 1,
        documentTypeName: 'Passport',
        documentKey: 'P-1',
        description: null,
        status: 'active' as const,
      },
    ]),
    documentTypes: vi.fn(async () => [
      { id: 1, name: 'Passport' },
      { id: 2, name: 'Id' },
    ]),
    addIdentifier: vi.fn(async () => 12),
    deleteIdentifier: vi.fn(async () => undefined),
    notes: vi.fn(async () => NOTES),
    addNote: vi.fn(async () => 5),
    updateNote: vi.fn(async () => undefined),
    deleteNote: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function render(ui: React.ReactElement, permissions: string[], api = kycApi()) {
  const view = renderWithAdapters(ui, { adapters: [provide(CLIENT_KYC_API, api)] });
  await act(() => view.fakes.session.signIn(mapSession({ ...captured, permissions }, 'default')));
  return { ...view, api };
}

const ALL = [
  'READ_CLIENTIDENTIFIER',
  'CREATE_CLIENTIDENTIFIER',
  'DELETE_CLIENTIDENTIFIER',
  'READ_CLIENTNOTE',
  'CREATE_CLIENTNOTE',
  'UPDATE_CLIENTNOTE',
  'DELETE_CLIENTNOTE',
];

describe('ClientIdentifiersScreen', () => {
  beforeEach(resetRouterMock);

  it('adds an identifier once a type and a key are given', async () => {
    const { api } = await render(<ClientIdentifiersScreen clientId={3} />, ALL);
    expect(await screen.findByTestId(TID.identifiers.row(7))).toHaveTextContent('Passport');
    await userEvent.click(screen.getByTestId(TID.identifiers.add));
    const save = screen.getByTestId(TID.identifierForm.submit);
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.type(screen.getByTestId(TID.identifierForm.key), 'ID-9');
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByTestId(TID.identifierForm.type));
    await userEvent.click(await screen.findByTestId(TID.option(TID.identifierForm.type, 2)));
    expect(save).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(save);
    await waitFor(() =>
      expect(api.addIdentifier).toHaveBeenCalledWith(3, {
        documentTypeId: 2,
        documentKey: 'ID-9',
        description: '',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId(TID.identifierForm.submit)).not.toBeInTheDocument(),
    );
  });

  it('puts a refused key under the key, keeping what was typed', async () => {
    const refusal = new AppError('validation', 400, null, [
      { field: 'documentKey', message: 'already exists' },
    ]);
    const api = kycApi({
      addIdentifier: vi.fn(async () => {
        throw refusal;
      }),
    });
    await render(<ClientIdentifiersScreen clientId={3} />, ALL, api);
    await userEvent.click(await screen.findByTestId(TID.identifiers.add));
    await userEvent.click(screen.getByTestId(TID.identifierForm.type));
    await userEvent.click(await screen.findByTestId(TID.option(TID.identifierForm.type, 1)));
    await userEvent.type(screen.getByTestId(TID.identifierForm.key), 'P-1');
    await userEvent.click(screen.getByTestId(TID.identifierForm.submit));
    expect(await screen.findByTestId(TID.fieldError(TID.identifierForm.key))).toHaveTextContent(
      'already exists',
    );
    expect(screen.getByTestId(TID.identifierForm.key)).toHaveValue('P-1');
  });

  it('deletes only once confirmed', async () => {
    const { api } = await render(<ClientIdentifiersScreen clientId={3} />, ALL);
    await userEvent.click(await screen.findByTestId(TID.identifiers.remove(7)));
    await userEvent.click(screen.getByTestId(TID.identifiers.cancelRemove));
    expect(api.deleteIdentifier).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId(TID.identifiers.remove(7)));
    await userEvent.click(screen.getByTestId(TID.identifiers.confirmRemove));
    await waitFor(() => expect(api.deleteIdentifier).toHaveBeenCalledWith(3, 7));
  });

  it('offers a reader no add or delete', async () => {
    await render(<ClientIdentifiersScreen clientId={3} />, ['READ_CLIENTIDENTIFIER']);
    await screen.findByTestId(TID.identifiers.row(7));
    expect(screen.queryByTestId(TID.identifiers.add)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.identifiers.remove(7))).not.toBeInTheDocument();
  });
});

describe('ClientNotesScreen', () => {
  beforeEach(resetRouterMock);

  it('shows author and day, and adds a note once it is not blank', async () => {
    const { api } = await render(<ClientNotesScreen clientId={3} />, ALL);
    expect(await screen.findByTestId(TID.notes.row(2))).toHaveTextContent('clerk');
    const add = screen.getByTestId(TID.notes.add);
    expect(add).toHaveAttribute('aria-disabled', 'true');
    await userEvent.type(screen.getByTestId(TID.notes.text), 'Visited');
    await userEvent.click(add);
    await waitFor(() => expect(api.addNote).toHaveBeenCalledWith(3, 'Visited'));
    await waitFor(() => expect(screen.getByTestId(TID.notes.text)).toHaveValue(''));
  });

  it('edits a note, and a cancelled edit sends nothing', async () => {
    const { api } = await render(<ClientNotesScreen clientId={3} />, ALL);
    await userEvent.click(await screen.findByTestId(TID.notes.edit(1)));
    expect(screen.getByTestId(TID.notes.editText)).toHaveValue('First');
    await userEvent.click(screen.getByTestId(TID.notes.cancelEdit));
    expect(api.updateNote).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId(TID.notes.edit(1)));
    await userEvent.clear(screen.getByTestId(TID.notes.editText));
    await userEvent.type(screen.getByTestId(TID.notes.editText), 'Changed');
    await userEvent.click(screen.getByTestId(TID.notes.save));
    await waitFor(() => expect(api.updateNote).toHaveBeenCalledWith(3, 1, 'Changed'));
  });

  it('deletes a note once confirmed', async () => {
    const { api } = await render(<ClientNotesScreen clientId={3} />, ALL);
    await userEvent.click(await screen.findByTestId(TID.notes.remove(2)));
    await userEvent.click(screen.getByTestId(TID.notes.confirmRemove));
    await waitFor(() => expect(api.deleteNote).toHaveBeenCalledWith(3, 2));
  });

  it('offers a reader no add, edit or delete', async () => {
    await render(<ClientNotesScreen clientId={3} />, ['READ_CLIENTNOTE']);
    await screen.findByTestId(TID.notes.row(1));
    expect(screen.queryByTestId(TID.notes.text)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.notes.edit(1))).not.toBeInTheDocument();
    expect(screen.queryByTestId(TID.notes.remove(1))).not.toBeInTheDocument();
  });
});

describe('noteDay', () => {
  it('formats the day, and gives nothing for a missing or unreadable date', () => {
    expect(noteDay('2026-10-05T12:00:00Z')).toMatch(/^2026-10-0[56]$/);
    expect(noteDay(null)).toBeNull();
    expect(noteDay('soon')).toBeNull();
  });
});
