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

import type { Client, ClientStatus, LegalForm } from '@/core/adapters/api/client.api';

const STATUS_KEYS: Record<Exclude<ClientStatus, 'unknown'>, string> = {
  pending: 'CLIENTS.STATUS.PENDING',
  active: 'CLIENTS.STATUS.ACTIVE',
  transferInProgress: 'CLIENTS.STATUS.TRANSFER_IN_PROGRESS',
  transferOnHold: 'CLIENTS.STATUS.TRANSFER_ON_HOLD',
  withdrawn: 'CLIENTS.STATUS.WITHDRAWN',
  rejected: 'CLIENTS.STATUS.REJECTED',
  closed: 'CLIENTS.STATUS.CLOSED',
};

/** A client's status in the user's language; a status this app does not know, in the server's. */
export function statusText(client: Client, t: (key: string) => string): string {
  return client.status === 'unknown' ? client.statusLabel : t(STATUS_KEYS[client.status]);
}

export const LEGAL_FORM_KEYS: Record<LegalForm, string> = {
  person: 'CLIENTS.PERSON',
  entity: 'CLIENTS.ENTITY',
};
