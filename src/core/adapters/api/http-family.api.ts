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

import { call, type ApiClient } from '@/core/http/client';

import { ISO_DATE_FIELDS, toIsoApiDate, withoutBlanks } from './api-date';
import type {
  CodeOption,
  FamilyApi,
  FamilyMember,
  FamilyMemberDraft,
  FamilyOptions,
} from './family.api';
import { required } from './required';

/** `ClientFamilyMembersData`, as the server sends it: `0` for a choice not made. */
export interface FamilyMemberPayload {
  readonly id?: number;
  readonly firstName?: string;
  readonly middleName?: string;
  readonly lastName?: string;
  readonly relationshipId?: number;
  readonly relationship?: string;
  readonly genderId?: number;
  readonly gender?: string;
  readonly maritalStatusId?: number;
  readonly maritalStatus?: string;
  readonly professionId?: number;
  readonly profession?: string;
  readonly qualification?: string;
  readonly mobileNumber?: string;
  readonly age?: number;
  /** Sent as an ISO string here, unlike most dates. */
  readonly dateOfBirth?: string | readonly number[];
  readonly isDependent?: boolean;
}

interface CodeValuePayload {
  readonly id?: number;
  readonly name?: string;
  readonly active?: boolean;
}

const orNull = (v: string | undefined) => (v === undefined || v === '' ? null : v);
/** The server stores and answers `0` for a code value not chosen. */
const chosen = (id: number | undefined) => (id === undefined || id === 0 ? null : id);

/** Exported for its own test: this is where upstream drift surfaces. */
export function mapFamilyMember(payload: FamilyMemberPayload): FamilyMember {
  return {
    id: required(payload.id, 'family member', 'id'),
    firstName: payload.firstName ?? '',
    middleName: orNull(payload.middleName),
    lastName: payload.lastName ?? '',
    relationshipId: chosen(payload.relationshipId),
    relationship: orNull(payload.relationship),
    genderId: chosen(payload.genderId),
    gender: orNull(payload.gender),
    maritalStatusId: chosen(payload.maritalStatusId),
    maritalStatus: orNull(payload.maritalStatus),
    professionId: chosen(payload.professionId),
    profession: orNull(payload.profession),
    qualification: orNull(payload.qualification),
    mobileNumber: orNull(payload.mobileNumber),
    age: payload.age || null,
    dateOfBirth: toIsoApiDate(payload.dateOfBirth),
    isDependent: payload.isDependent === true,
  };
}

const codeOptions = (values: CodeValuePayload[] | undefined): readonly CodeOption[] =>
  (values ?? [])
    .filter((v) => v.active !== false && v.id !== undefined)
    .map((v) => ({ id: required(v.id, 'code value', 'id'), name: v.name ?? '' }));

/** The fields both an add and an edit send; the date of birth brings its format. */
function memberBody(draft: FamilyMemberDraft) {
  return withoutBlanks({
    firstName: draft.firstName.trim(),
    middleName: draft.middleName.trim(),
    lastName: draft.lastName.trim(),
    qualification: draft.qualification.trim(),
    mobileNumber: draft.mobileNumber.trim(),
    age: draft.age ?? undefined,
    ...(draft.dateOfBirth ? { dateOfBirth: draft.dateOfBirth, ...ISO_DATE_FIELDS } : {}),
  });
}

export class HttpFamilyApi implements FamilyApi {
  constructor(private readonly client: ApiClient) {}

  async members(clientId: number): Promise<readonly FamilyMember[]> {
    const list = await call(
      this.client.GET('/v1/clients/{clientId}/familymembers', { params: { path: { clientId } } }),
    );
    return ((list ?? []) as FamilyMemberPayload[]).map(mapFamilyMember);
  }

  async options(clientId: number): Promise<FamilyOptions> {
    const template = (await call(
      this.client.GET('/v1/clients/{clientId}/familymembers/template', {
        params: { path: { clientId } },
      }),
    )) as Record<string, CodeValuePayload[] | undefined> | undefined;
    return {
      relationships: codeOptions(template?.relationshipIdOptions),
      genders: codeOptions(template?.genderIdOptions),
      maritalStatuses: codeOptions(template?.maritalStatusIdOptions),
      professions: codeOptions(template?.professionIdOptions),
    };
  }

  async add(clientId: number, draft: FamilyMemberDraft): Promise<number> {
    const response = await call(
      this.client.POST('/v1/clients/{clientId}/familymembers', {
        params: { path: { clientId } },
        body: {
          ...memberBody(draft),
          relationshipId: draft.relationshipId,
          ...(draft.genderId === null ? {} : { genderId: draft.genderId }),
          ...(draft.maritalStatusId === null ? {} : { maritalStatusId: draft.maritalStatusId }),
          ...(draft.professionId === null ? {} : { professionId: draft.professionId }),
          isDependent: draft.isDependent,
        },
      }),
    );
    const created = response as { readonly resourceId?: number } | undefined;
    return required(created?.resourceId, 'family member create response', 'id');
  }

  async update(clientId: number, memberId: number, draft: FamilyMemberDraft): Promise<void> {
    await call(
      this.client.PUT('/v1/clients/{clientId}/familymembers/{familyMemberId}', {
        params: { path: { clientId, familyMemberId: memberId } },
        // A PUT replaces the member: every field goes, and the server needs all three optional
        // choices present, `0` for none, or it fails with a 500.
        body: {
          ...memberBody(draft),
          relationshipId: draft.relationshipId,
          genderId: draft.genderId ?? 0,
          maritalStatusId: draft.maritalStatusId ?? 0,
          professionId: draft.professionId ?? 0,
          isDependent: draft.isDependent,
        },
      }),
    );
  }

  async remove(clientId: number, memberId: number): Promise<void> {
    await call(
      this.client.DELETE('/v1/clients/{clientId}/familymembers/{familyMemberId}', {
        params: { path: { clientId, familyMemberId: memberId } },
      }),
    );
  }
}
