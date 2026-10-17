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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { CLIENT_KYC_API, type IdentifierDraft } from '@/core/adapters/api/client-kyc.api';

import { clientKeys } from './clients.keys';

export function useIdentifiers(clientId: number) {
  const api = useAdapter(CLIENT_KYC_API);
  return useQuery({
    queryKey: clientKeys.identifiers(clientId),
    queryFn: () => api.identifiers(clientId),
  });
}

export function useDocumentTypes(clientId: number, { enabled }: { enabled: boolean }) {
  const api = useAdapter(CLIENT_KYC_API);
  return useQuery({
    queryKey: clientKeys.documentTypes(clientId),
    queryFn: () => api.documentTypes(clientId),
    enabled,
  });
}

export function useNotes(clientId: number) {
  const api = useAdapter(CLIENT_KYC_API);
  return useQuery({ queryKey: clientKeys.notes(clientId), queryFn: () => api.notes(clientId) });
}

/** Every write reloads the list it changed, so a screen shows the server's view of it. */
export function useKycMutations(clientId: number) {
  const api = useAdapter(CLIENT_KYC_API);
  const queryClient = useQueryClient();
  const reload = (key: readonly unknown[]) => () =>
    queryClient.invalidateQueries({ queryKey: key });
  const identifiers = reload(clientKeys.identifiers(clientId));
  const notes = reload(clientKeys.notes(clientId));
  return {
    addIdentifier: useMutation({
      mutationFn: (draft: IdentifierDraft) => api.addIdentifier(clientId, draft),
      onSuccess: identifiers,
    }),
    deleteIdentifier: useMutation({
      mutationFn: (identifierId: number) => api.deleteIdentifier(clientId, identifierId),
      onSuccess: identifiers,
    }),
    addNote: useMutation({
      mutationFn: (note: string) => api.addNote(clientId, note),
      onSuccess: notes,
    }),
    updateNote: useMutation({
      mutationFn: ({ noteId, note }: { noteId: number; note: string }) =>
        api.updateNote(clientId, noteId, note),
      onSuccess: notes,
    }),
    deleteNote: useMutation({
      mutationFn: (noteId: number) => api.deleteNote(clientId, noteId),
      onSuccess: notes,
    }),
  };
}
