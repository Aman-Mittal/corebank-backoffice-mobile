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

import { token } from '../registry';

/** A code value an administrator fills (relationship, gender, marital status, profession). */
export interface CodeOption {
  readonly id: number;
  readonly name: string;
}

/** A member of a client's family. A choice not made is `null`, never the server's `0`. */
export interface FamilyMember {
  readonly id: number;
  readonly firstName: string;
  readonly middleName: string | null;
  readonly lastName: string;
  readonly relationshipId: number | null;
  readonly relationship: string | null;
  readonly genderId: number | null;
  readonly gender: string | null;
  readonly maritalStatusId: number | null;
  readonly maritalStatus: string | null;
  readonly professionId: number | null;
  readonly profession: string | null;
  readonly qualification: string | null;
  readonly mobileNumber: string | null;
  /** `null` when unknown (the server answers `0`). */
  readonly age: number | null;
  /** ISO date; `null` when unknown. */
  readonly dateOfBirth: string | null;
  readonly isDependent: boolean;
}

/** What the form collects; the adapter shapes it for the server. */
export interface FamilyMemberDraft {
  readonly firstName: string;
  readonly middleName: string;
  readonly lastName: string;
  readonly relationshipId: number;
  readonly genderId: number | null;
  readonly maritalStatusId: number | null;
  readonly professionId: number | null;
  readonly qualification: string;
  readonly mobileNumber: string;
  readonly age: number | null;
  /** ISO date, or `null`. */
  readonly dateOfBirth: string | null;
  readonly isDependent: boolean;
}

/** The choices the family member form offers, from its template. */
export interface FamilyOptions {
  readonly relationships: readonly CodeOption[];
  readonly genders: readonly CodeOption[];
  readonly maritalStatuses: readonly CodeOption[];
  readonly professions: readonly CodeOption[];
}

/** A client's family members (DOCS/test-plan/P1-13-family-members.md). */
export interface FamilyApi {
  members(clientId: number): Promise<readonly FamilyMember[]>;
  options(clientId: number): Promise<FamilyOptions>;
  /** Adds a member and answers its id. */
  add(clientId: number, draft: FamilyMemberDraft): Promise<number>;
  update(clientId: number, memberId: number, draft: FamilyMemberDraft): Promise<void>;
  remove(clientId: number, memberId: number): Promise<void>;
}

export const FAMILY_API = token<FamilyApi>('FamilyApi');
