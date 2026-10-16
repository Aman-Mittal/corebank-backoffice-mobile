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
 * An office, as the application understands one.
 *
 * Ported from fineract-backoffice-ui (`office.api.ts`), where the disagreement it corrects was
 * verified against a running instance: `GetOfficesResponse` declares `openingDate?: string`
 * while the server sends `[2009, 1, 1]`, and it omits `parentId`/`parentName`, which the payload
 * carries. Mapping once here makes `openingDate` an ISO date everywhere downstream.
 */
export interface Office {
  readonly id: number;
  readonly name: string;
  /** The hierarchy-indented name the server builds for display (`....Branch`). */
  readonly nameDecorated: string;
  readonly externalId: string | null;
  readonly hierarchy: string;
  /** `null` for the head office. */
  readonly parentId: number | null;
  readonly parentName: string | null;
  /** ISO `YYYY-MM-DD`. */
  readonly openingDate: string | null;
}

/** What creating or editing an office collects. The adapter adds the date format and locale. */
export interface OfficeDraft {
  readonly name: string;
  readonly externalId?: string | null;
  /** ISO `YYYY-MM-DD`. */
  readonly openingDate: string;
  /** Omitted when creating the head office. */
  readonly parentId?: number | null;
}

export interface OfficeApi {
  /** Every office the user may see; `includeAllOffices` widens past their own hierarchy. */
  list(includeAllOffices?: boolean): Promise<Office[]>;
  get(officeId: number): Promise<Office>;
  /** Creates an office and answers its id, which callers use to select it. */
  create(draft: OfficeDraft): Promise<number>;
  /** `parentId` is not accepted: `PUT /offices/{id}` does not move an office. */
  update(officeId: number, draft: Omit<OfficeDraft, 'parentId'>): Promise<void>;
}

export const OFFICE_API = token<OfficeApi>('OfficeApi');
