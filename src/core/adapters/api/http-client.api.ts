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

import type { components } from '@/api/generated/openapi';
import { call, type ApiClient } from '@/core/http/client';

import { ISO_DATE_FIELDS, toIsoApiDate, withoutBlanks } from './api-date';
import type {
  Client,
  ClientApi,
  ClientDraft,
  ClientPage,
  ClientQuery,
  ClientStatus,
  LegalForm,
} from './client.api';
import { required } from './required';

type ClientData = components['schemas']['GetClientsClientIdResponse'];
type ApiDate = string | number[];

/** What a client payload actually sends, where it differs from the generated type. */
export type ClientPayload = Omit<ClientData, 'activationDate' | 'timeline' | 'status'> & {
  /** Declares `description`; sends `value`, the localized label. */
  readonly status?: { readonly id?: number; readonly code?: string; readonly value?: string };
  /** Declared `string`; sent as `[y, m, d]`. */
  readonly activationDate?: ApiDate;
  readonly timeline?: { readonly submittedOnDate?: ApiDate };
  /** Sent, never declared on the single-client response. */
  readonly middlename?: string;
  readonly fullname?: string;
  readonly mobileNo?: string;
  readonly legalForm?: { readonly id?: number; readonly code?: string; readonly value?: string };
};

const STATUS_CODES: Record<string, ClientStatus> = {
  'clientStatusType.pending': 'pending',
  'clientStatusType.active': 'active',
  'clientStatusType.transfer.in.progress': 'transferInProgress',
  'clientStatusType.transfer.on.hold': 'transferOnHold',
  'clientStatusType.withdraw': 'withdrawn',
  'clientStatusType.rejected': 'rejected',
  'clientStatusType.closed': 'closed',
};

/** `status.code` → status. A code this app does not know is `unknown`, never a guess. */
export function clientStatus(code: string | undefined): ClientStatus {
  return (code !== undefined && STATUS_CODES[code]) || 'unknown';
}

function legalFormOf(payload: ClientPayload): LegalForm | null {
  if (payload.legalForm?.id === 1) return 'person';
  if (payload.legalForm?.id === 2) return 'entity';
  return null;
}

const orNull = (v: string | undefined) => (v === undefined || v === '' ? null : v);

/** Maps one client payload. Exported for its own test: this is where upstream drift surfaces. */
export function mapClient(payload: ClientPayload): Client {
  const names = [payload.firstname, payload.middlename, payload.lastname].filter(Boolean);
  return {
    id: required(payload.id, 'client', 'id'),
    accountNo: payload.accountNo ?? '',
    displayName: payload.displayName ?? payload.fullname ?? names.join(' '),
    firstname: orNull(payload.firstname),
    middlename: orNull(payload.middlename),
    lastname: orNull(payload.lastname),
    fullname: orNull(payload.fullname),
    legalForm: legalFormOf(payload),
    status: clientStatus(payload.status?.code),
    statusLabel: payload.status?.value ?? '',
    officeId: payload.officeId ?? null,
    officeName: payload.officeName ?? '',
    externalId: orNull(payload.externalId),
    mobileNo: orNull(payload.mobileNo),
    emailAddress: orNull(payload.emailAddress),
    submittedOnDate: toIsoApiDate(payload.timeline?.submittedOnDate),
    activationDate: toIsoApiDate(payload.activationDate),
  };
}

/** The body `POST /clients` takes for a draft: only the chosen legal form's names, no blanks. */
export function createBody(draft: ClientDraft) {
  const names =
    draft.legalForm === 'person'
      ? {
          firstname: draft.firstname,
          middlename: draft.middlename ?? undefined,
          lastname: draft.lastname,
        }
      : { fullname: draft.fullname };
  return withoutBlanks({
    legalFormId: draft.legalForm === 'person' ? 1 : 2,
    officeId: draft.officeId,
    ...names,
    externalId: draft.externalId ?? undefined,
    mobileNo: draft.mobileNo ?? undefined,
    emailAddress: draft.emailAddress ?? undefined,
    submittedOnDate: draft.submittedOnDate,
    active: draft.active,
    // The server refuses an activation date for a client that is not being activated.
    activationDate: draft.active ? draft.activationDate : undefined,
    ...ISO_DATE_FIELDS,
  });
}

export class HttpClientApi implements ClientApi {
  constructor(private readonly client: ApiClient) {}

  async list(query: ClientQuery): Promise<ClientPage> {
    const page = await call(
      this.client.GET('/v1/clients', {
        params: {
          // No `legalForm`: filtering by it hid entities in the reference (its issue #534).
          query: withoutBlanks({
            displayName: query.search?.trim(),
            offset: query.offset,
            limit: query.limit,
            orderBy: 'displayName',
            sortOrder: 'ASC',
          }),
        },
      }),
    );
    return {
      total: page?.totalFilteredRecords ?? 0,
      items: ((page?.pageItems ?? []) as ClientPayload[]).map(mapClient),
    };
  }

  async get(clientId: number): Promise<Client> {
    const payload = await call(
      this.client.GET('/v1/clients/{clientId}', { params: { path: { clientId } } }),
    );
    return mapClient(payload as ClientPayload);
  }

  async create(draft: ClientDraft): Promise<number> {
    const response = await call(this.client.POST('/v1/clients', { body: createBody(draft) }));
    return required(response?.clientId ?? response?.resourceId, 'client create response', 'id');
  }

  async activate(clientId: number, activationDate: string): Promise<void> {
    await call(
      this.client.POST('/v1/clients/{clientId}', {
        params: { path: { clientId }, query: { command: 'activate' } },
        body: { activationDate, ...ISO_DATE_FIELDS },
      }),
    );
  }
}
