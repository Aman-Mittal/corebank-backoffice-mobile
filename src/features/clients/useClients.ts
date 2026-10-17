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

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import {
  CLIENT_API,
  type ClientCommand,
  type ClientCommandInput,
  type ClientDraft,
  type ClientQuery,
  type ReasonedCommand,
} from '@/core/adapters/api/client.api';

import { clientKeys } from './clients.keys';

/** One page of clients. The previous page stays on screen while the next one loads. */
export function useClientPage(query: ClientQuery) {
  const api = useAdapter(CLIENT_API);
  return useQuery({
    queryKey: clientKeys.list(query),
    queryFn: () => api.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useClient(clientId: number, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useAdapter(CLIENT_API);
  return useQuery({
    queryKey: clientKeys.detail(clientId),
    queryFn: () => api.get(clientId),
    enabled,
  });
}

export function useCreateClient() {
  const api = useAdapter(CLIENT_API);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: ClientDraft) => api.create(draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

/**
 * Runs a lifecycle command. Settled either way, the client is reloaded: after a refusal, the
 * server's status may not be the one the page showed (another user acted first).
 */
export function useClientCommand(clientId: number) {
  const api = useAdapter(CLIENT_API);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ command, input }: { command: ClientCommand; input: ClientCommandInput }) =>
      api.command(clientId, command, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  });
}

export function useClientReasons(command: ReasonedCommand | null) {
  const api = useAdapter(CLIENT_API);
  return useQuery({
    queryKey: clientKeys.reasons(command ?? 'reject'),
    queryFn: () => api.reasons(command ?? 'reject'),
    enabled: command !== null,
  });
}
