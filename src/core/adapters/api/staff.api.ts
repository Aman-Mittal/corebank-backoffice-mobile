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

/**
 * A staff member, as the application understands one.
 *
 * Ported from fineract-backoffice-ui (`staff.api.ts`, Apache-2.0). There, `GET /staff/{id}` was
 * verified to send `joiningDate` as a string while `GET /offices` sends `openingDate` as
 * `[y, m, d]`: two encodings in one area. The mapper accepts both, so this is ISO either way.
 */
export interface Staff {
  readonly id: number;
  readonly firstname: string;
  readonly lastname: string;
  /** The `Lastname, Firstname` form the server builds for display. */
  readonly displayName: string;
  readonly officeId: number | null;
  readonly officeName: string;
  readonly externalId: string | null;
  readonly mobileNo: string | null;
  readonly emailAddress: string | null;
  readonly isLoanOfficer: boolean;
  readonly isActive: boolean;
  /** ISO `YYYY-MM-DD`. */
  readonly joiningDate: string | null;
}

/** How a staff query is narrowed. Each is passed only when given. */
export interface StaffQuery {
  /** Staff are scoped by office; a picker that offers staff chooses an office first. */
  readonly officeId?: number;
  readonly loanOfficersOnly?: boolean;
  /**
   * `active` (the server's default), `inactive` or `all`. Omitting it is not "any status": the
   * default hides inactive staff, which is why the staff list asks for `all`.
   */
  readonly status?: 'active' | 'inactive' | 'all';
}

/** What creating a staff member collects. The adapter adds the date format and locale. */
export interface StaffDraft {
  readonly officeId: number;
  readonly firstname: string;
  readonly lastname: string;
  readonly externalId?: string | null;
  readonly mobileNo?: string | null;
  readonly emailAddress?: string | null;
  readonly isLoanOfficer: boolean;
  readonly isActive: boolean;
  /** ISO `YYYY-MM-DD`. */
  readonly joiningDate: string;
}

/**
 * What editing a staff member changes. Office and joining date are not here: the edit screen
 * shows them but does not send them (DOCS/test-plan/P1-04-offices-staff.md).
 */
export interface StaffUpdate {
  readonly firstname: string;
  readonly lastname: string;
  readonly externalId?: string | null;
  readonly mobileNo?: string | null;
  readonly isLoanOfficer: boolean;
  readonly isActive: boolean;
}

export interface StaffApi {
  list(query?: StaffQuery): Promise<Staff[]>;
  get(staffId: number): Promise<Staff>;
  /** Creates a staff member and answers its id. */
  create(draft: StaffDraft): Promise<number>;
  update(staffId: number, update: StaffUpdate): Promise<void>;
}

export const STAFF_API = token<StaffApi>('StaffApi');
