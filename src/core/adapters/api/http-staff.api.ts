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
import { listBody, required } from './required';
import type { Staff, StaffApi, StaffDraft, StaffQuery, StaffUpdate } from './staff.api';

type StaffData = components['schemas']['StaffData'];
type StaffCreateResponse = components['schemas']['StaffCreateResponse'];

/** What a staff payload actually sends, where it differs from the generated type. */
export type StaffPayload = Omit<StaffData, 'joiningDate'> & {
  /** Declared `string`, and sent as one; accepted as `[y, m, d]` too (see {@link Staff}). */
  readonly joiningDate?: string | number[];
  /** Sent, never declared. */
  readonly emailAddress?: string;
};

/** Maps one staff payload. Exported for its own test: this is where upstream drift surfaces. */
export function mapStaff(payload: StaffPayload): Staff {
  const firstname = payload.firstname ?? '';
  const lastname = payload.lastname ?? '';
  return {
    id: required(payload.id, 'staff member', 'id'),
    firstname,
    lastname,
    // What every picker renders; a blank option is worse than an unformatted one.
    displayName: payload.displayName ?? [lastname, firstname].filter(Boolean).join(', '),
    officeId: payload.officeId ?? null,
    officeName: payload.officeName ?? '',
    externalId: payload.externalId ?? null,
    mobileNo: payload.mobileNo ?? null,
    emailAddress: payload.emailAddress ?? null,
    isLoanOfficer: payload.isLoanOfficer === true,
    isActive: payload.isActive === true,
    joiningDate: toIsoApiDate(payload.joiningDate),
  };
}

/**
 * `{ [key]: value }` when the user filled the field in, `{}` otherwise: the server rejects
 * `mobileNo: ""` rather than treating it as absent, so blanks are omitted, never sent.
 */
function present<K extends string>(
  key: K,
  value: string | null | undefined,
): Partial<Record<K, string>> {
  return value && value.trim() !== '' ? ({ [key]: value } as Record<K, string>) : {};
}

export class HttpStaffApi implements StaffApi {
  constructor(private readonly client: ApiClient) {}

  async list(query: StaffQuery = {}): Promise<Staff[]> {
    const payloads = await call(
      this.client.GET('/v1/staff', {
        params: {
          query: withoutBlanks({
            officeId: query.officeId,
            loanOfficersOnly: query.loanOfficersOnly,
            status: query.status,
          }),
        },
      }),
    );
    // An office with no staff is an ordinary state, and has been seen as an empty body.
    return listBody<StaffPayload>(payloads, 'GET /staff').map(mapStaff);
  }

  async get(staffId: number): Promise<Staff> {
    const payload = await call(
      this.client.GET('/v1/staff/{staffId}', { params: { path: { staffId } } }),
    );
    return mapStaff(payload as StaffPayload);
  }

  async create(draft: StaffDraft): Promise<number> {
    const response = await call(
      this.client.POST('/v1/staff', {
        body: {
          officeId: draft.officeId,
          firstname: draft.firstname,
          lastname: draft.lastname,
          ...present('externalId', draft.externalId),
          ...present('mobileNo', draft.mobileNo),
          ...present('emailAddress', draft.emailAddress),
          isLoanOfficer: draft.isLoanOfficer,
          isActive: draft.isActive,
          joiningDate: draft.joiningDate,
          ...ISO_DATE_FIELDS,
        },
      }),
    );
    // The spec declares only a `default` response for `POST /staff`, which openapi-fetch types as
    // an error; the server answers 200 with this body.
    const created = response as unknown as StaffCreateResponse;
    return required(created.resourceId, 'staff create response', 'resourceId');
  }

  async update(staffId: number, update: StaffUpdate): Promise<void> {
    await call(
      this.client.PUT('/v1/staff/{staffId}', {
        params: { path: { staffId } },
        body: {
          firstname: update.firstname,
          lastname: update.lastname,
          ...present('externalId', update.externalId),
          ...present('mobileNo', update.mobileNo),
          isLoanOfficer: update.isLoanOfficer,
          isActive: update.isActive,
        },
      }),
    );
  }
}
