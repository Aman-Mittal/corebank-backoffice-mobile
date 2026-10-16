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
  STAFF_API,
  type StaffDraft,
  type StaffQuery,
  type StaffUpdate,
} from '@/core/adapters/api/staff.api';

import { staffKeys } from './staff.keys';

/** Staff matching `query`. The previous page stays on screen while a new filter loads. */
export function useStaffList(query: StaffQuery) {
  const api = useAdapter(STAFF_API);
  return useQuery({
    queryKey: staffKeys.list(query),
    queryFn: () => api.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useStaffMember(staffId: number, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useAdapter(STAFF_API);
  return useQuery({
    queryKey: staffKeys.detail(staffId),
    queryFn: () => api.get(staffId),
    enabled,
  });
}

export function useCreateStaff() {
  const api = useAdapter(STAFF_API);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: StaffDraft) => api.create(draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useUpdateStaff(staffId: number) {
  const api = useAdapter(STAFF_API);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: StaffUpdate) => api.update(staffId, update),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
