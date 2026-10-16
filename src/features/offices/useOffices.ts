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
import { OFFICE_API, type OfficeDraft } from '@/core/adapters/api/office.api';

import { officeKeys } from './offices.keys';

/** Every office, across the user's whole hierarchy and beyond (`includeAllOffices`). */
export function useOffices({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useAdapter(OFFICE_API);
  return useQuery({ queryKey: officeKeys.list(true), queryFn: () => api.list(true), enabled });
}

/** Creates an office; answers its id. Every cached office read is stale afterwards. */
export function useCreateOffice() {
  const api = useAdapter(OFFICE_API);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: OfficeDraft) => api.create(draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: officeKeys.all }),
  });
}

export function useUpdateOffice(officeId: number) {
  const api = useAdapter(OFFICE_API);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: Omit<OfficeDraft, 'parentId'>) => api.update(officeId, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: officeKeys.all }),
  });
}
