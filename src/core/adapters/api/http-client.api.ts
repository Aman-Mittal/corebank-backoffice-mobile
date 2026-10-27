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
  ClientCommand,
  ClientCommandInput,
  ClientDraft,
  ClientPage,
  ClientQuery,
  ClientReason,
  ClientStatus,
  LegalForm,
  ReasonedCommand,
  StaffOption,
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
  readonly timeline?: { readonly submittedOnDate?: ApiDate; readonly closedOnDate?: ApiDate };
  /** Sent, never declared on the single-client response. */
  readonly middlename?: string;
  readonly fullname?: string;
  readonly mobileNo?: string;
  readonly staffName?: string;
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
    closedOnDate: toIsoApiDate(payload.timeline?.closedOnDate),
    staffId: payload.staffId ?? null,
    staffName: orNull(payload.staffName),
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

/**
 * Each command's body fields. Close reads `closureDate` (the reference sent `closedOnDate`, which
 * the server ignores); both undos read `reopenedDate`.
 */
const COMMAND_FIELDS: Record<ClientCommand, { date: string; reason?: string }> = {
  activate: { date: 'activationDate' },
  reject: { date: 'rejectionDate', reason: 'rejectionReasonId' },
  withdraw: { date: 'withdrawalDate', reason: 'withdrawalReasonId' },
  close: { date: 'closureDate', reason: 'closureReasonId' },
  reactivate: { date: 'reactivationDate' },
  undoRejection: { date: 'reopenedDate' },
  undoWithdrawal: { date: 'reopenedDate' },
};

/** The body `POST /clients/{id}?command=` takes: the command's date, its reason if it has one. */
export function commandBody(command: ClientCommand, input: ClientCommandInput) {
  const fields = COMMAND_FIELDS[command];
  return {
    [fields.date]: input.date,
    ...(fields.reason ? { [fields.reason]: input.reasonId } : {}),
    ...ISO_DATE_FIELDS,
  };
}

/** A member of staff as the client template sends it (`StaffData`). */
interface StaffPayload {
  readonly id?: number;
  readonly displayName?: string;
}

/** A code value as the command template sends it (`CodeValueData`). */
interface Narration {
  readonly id?: number;
  readonly name?: string;
  readonly position?: number;
  readonly active?: boolean;
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
    // An empty body is an empty page; a body with no rows array is a failure, not "no clients".
    if (page !== undefined && page !== null && !Array.isArray(page.pageItems)) {
      throw new Error('GET /clients answered a body that is not a page');
    }
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

  async command(clientId: number, command: ClientCommand, input: ClientCommandInput) {
    await call(
      this.client.POST('/v1/clients/{clientId}', {
        params: { path: { clientId }, query: { command } },
        body: commandBody(command, input),
      }),
    );
  }

  async staffOptions(officeId: number): Promise<readonly StaffOption[]> {
    // Without `staffInSelectedOfficeOnly`: it would hide head-office staff, whom the server
    // assigns to a branch client all the same.
    const template = await call(
      this.client.GET('/v1/clients/template', { params: { query: { officeId } } }),
    );
    const staff = ((template as { staffOptions?: StaffPayload[] } | undefined)?.staffOptions ??
      []) as StaffPayload[];
    return staff
      .filter((m) => m.id !== undefined)
      .map((m) => ({ id: required(m.id, 'staff option', 'id'), name: m.displayName ?? '' }));
  }

  async assignStaff(clientId: number, staffId: number): Promise<void> {
    await this.staffCommand(clientId, 'assignStaff', staffId);
  }

  async unassignStaff(clientId: number, staffId: number): Promise<void> {
    await this.staffCommand(clientId, 'unassignStaff', staffId);
  }

  private async staffCommand(clientId: number, command: string, staffId: number) {
    await call(
      this.client.POST('/v1/clients/{clientId}', {
        params: { path: { clientId }, query: { command } },
        body: { staffId },
      }),
    );
  }

  async reasons(command: ReasonedCommand): Promise<readonly ClientReason[]> {
    // The template needs only READ_CLIENT; the code tables would need READ_CODE as well.
    const template = await call(
      this.client.GET('/v1/clients/template', { params: { query: { commandParam: command } } }),
    );
    const narrations = ((template as { narrations?: Narration[] } | undefined)?.narrations ??
      []) as Narration[];
    return narrations
      .filter((n) => n.active !== false && n.id !== undefined)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((n) => ({ id: required(n.id, 'client reason', 'id'), name: n.name ?? '' }));
  }
}
