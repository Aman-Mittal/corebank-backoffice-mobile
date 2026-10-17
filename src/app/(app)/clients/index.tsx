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

import { CLIENT_ACCESS } from '@/features/clients/access';
import { ClientsListScreen } from '@/features/clients/ClientsListScreen';
import { RequireAccess } from '@/ui/RequireAccess';

export default function ClientsRoute() {
  return (
    <RequireAccess access={CLIENT_ACCESS.read}>
      <ClientsListScreen />
    </RequireAccess>
  );
}
