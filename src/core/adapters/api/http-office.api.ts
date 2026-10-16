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

import { ISO_DATE_FIELDS, toIsoApiDate } from './api-date';
import { required } from './required';
import type { Office, OfficeApi, OfficeDraft } from './office.api';

type GetOfficesResponse = components['schemas']['GetOfficesResponse'];

/** What `GET /offices` actually sends, where it differs from the generated type. */
export type OfficePayload = Omit<GetOfficesResponse, 'openingDate'> & {
  /** Declared `string`; sent as `[year, month, day]`. */
  readonly openingDate?: string | number[];
  /** Sent, never declared. */
  readonly parentId?: number;
  readonly parentName?: string;
};

/** Maps one office payload. Exported for its own test: this is where upstream drift surfaces. */
export function mapOffice(payload: OfficePayload): Office {
  return {
    id: required(payload.id, 'office', 'id'),
    name: payload.name ?? '',
    nameDecorated: payload.nameDecorated ?? payload.name ?? '',
    externalId: payload.externalId ?? null,
    hierarchy: payload.hierarchy ?? '',
    parentId: payload.parentId ?? null,
    parentName: payload.parentName ?? null,
    openingDate: toIsoApiDate(payload.openingDate),
  };
}

export class HttpOfficeApi implements OfficeApi {
  constructor(private readonly client: ApiClient) {}

  async list(includeAllOffices?: boolean): Promise<Office[]> {
    const payloads = await call(
      this.client.GET('/v1/offices', {
        params: { query: includeAllOffices === undefined ? {} : { includeAllOffices } },
      }),
    );
    // `?? []`: this endpoint has been seen to answer an empty body.
    return ((payloads ?? []) as OfficePayload[]).map(mapOffice);
  }

  async get(officeId: number): Promise<Office> {
    const payload = await call(
      this.client.GET('/v1/offices/{officeId}', { params: { path: { officeId } } }),
    );
    return mapOffice(payload as OfficePayload);
  }

  async create(draft: OfficeDraft): Promise<number> {
    const response = await call(
      this.client.POST('/v1/offices', {
        body: {
          name: draft.name,
          ...(draft.externalId ? { externalId: draft.externalId } : {}),
          ...(draft.parentId === undefined || draft.parentId === null
            ? {}
            : { parentId: draft.parentId }),
          openingDate: draft.openingDate,
          ...ISO_DATE_FIELDS,
        },
      }),
    );
    return required(response.resourceId, 'office create response', 'resourceId');
  }

  async update(officeId: number, draft: Omit<OfficeDraft, 'parentId'>): Promise<void> {
    await call(
      this.client.PUT('/v1/offices/{officeId}', {
        params: { path: { officeId } },
        body: {
          name: draft.name,
          ...(draft.externalId ? { externalId: draft.externalId } : {}),
          openingDate: draft.openingDate,
          ...ISO_DATE_FIELDS,
        },
      }),
    );
  }
}
