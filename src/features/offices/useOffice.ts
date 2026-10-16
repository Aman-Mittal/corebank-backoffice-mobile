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

import { useQuery } from '@tanstack/react-query';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { OFFICE_API } from '@/core/adapters/api/office.api';

import { officeKeys } from './offices.keys';

/** One office. Pass `enabled: false` to hold the request (e.g. while signing out). */
export function useOffice(officeId: number, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useAdapter(OFFICE_API);
  return useQuery({
    queryKey: officeKeys.detail(officeId),
    queryFn: () => api.get(officeId),
    enabled,
  });
}
