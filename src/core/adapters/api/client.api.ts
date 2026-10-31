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
 * A client's lifecycle status, read from `status.code` (`clientStatusType.active`). The
 * localized `status.value` is for display only; nothing branches on it (DOCS/ADAPTERS.md).
 */
export type ClientStatus =
  | 'pending'
  | 'active'
  | 'transferInProgress'
  | 'transferOnHold'
  | 'withdrawn'
  | 'rejected'
  | 'closed'
  | 'unknown';

/** Person (legal form 1) or entity (legal form 2). */
export type LegalForm = 'person' | 'entity';

/** A client, as the application understands one. Dates are ISO `YYYY-MM-DD` or `null`. */
export interface Client {
  readonly id: number;
  readonly accountNo: string;
  /** "Ada Lovelace" for a person, the full name for an entity, as the server builds it. */
  readonly displayName: string;
  readonly firstname: string | null;
  readonly middlename: string | null;
  readonly lastname: string | null;
  /** An entity's name. */
  readonly fullname: string | null;
  /** `null` when the server does not say (list rows, older servers). */
  readonly legalForm: LegalForm | null;
  readonly status: ClientStatus;
  /** The server's own words for the status, shown when `status` is `unknown`. */
  readonly statusLabel: string;
  readonly officeId: number | null;
  readonly officeName: string;
  readonly externalId: string | null;
  readonly mobileNo: string | null;
  readonly emailAddress: string | null;
  readonly submittedOnDate: string | null;
  readonly activationDate: string | null;
  /** When it was closed; `null` for a client that is not closed. */
  readonly closedOnDate: string | null;
  /** The assigned member of staff (loan officer); both `null` when no one is. */
  readonly staffId: number | null;
  readonly staffName: string | null;
  /** Where a transfer in progress would move the client; both `null` when none is. */
  readonly transferToOfficeId: number | null;
  readonly transferToOfficeName: string | null;
}

/** A member of staff a client may be assigned to. */
export interface StaffOption {
  readonly id: number;
  readonly name: string;
}

/** One page of a client query. */
export interface ClientPage {
  /** Every client matching the query, across all pages. */
  readonly total: number;
  readonly items: readonly Client[];
}

/** How the client list is narrowed and paged. Each is passed only when given. */
export interface ClientQuery {
  /** Matches anywhere in the display name, on the server. */
  readonly search?: string;
  readonly offset: number;
  readonly limit: number;
}

/** What creating a client collects. The adapter adds the date format and locale. */
export type ClientDraft = {
  readonly officeId: number;
  /** ISO. */
  readonly submittedOnDate: string;
  readonly externalId?: string | null;
  readonly mobileNo?: string | null;
  readonly emailAddress?: string | null;
} & (
  | {
      readonly legalForm: 'person';
      readonly firstname: string;
      readonly middlename?: string | null;
      readonly lastname: string;
    }
  | { readonly legalForm: 'entity'; readonly fullname: string }
) &
  (
    | { readonly active: true; /** ISO. */ readonly activationDate: string }
    | { readonly active: false }
  );

/** The commands that move a client between statuses (`POST /clients/{id}?command=`). */
export type ClientCommand =
  'activate' | 'reject' | 'withdraw' | 'close' | 'reactivate' | 'undoRejection' | 'undoWithdrawal';

/** The commands that need a reason, chosen from a code the administrator fills. */
export type ReasonedCommand = Extract<ClientCommand, 'reject' | 'withdraw' | 'close'>;

export interface ClientCommandInput {
  /** ISO; the command's own date (activation, rejection, closure, …). */
  readonly date: string;
  /** Required for a `ReasonedCommand`, ignored otherwise. */
  readonly reasonId?: number | null;
}

/** The transfer commands (DOCS/test-plan/P1-12-client-transfer.md). */
export type TransferCommand =
  | 'proposeTransfer'
  | 'proposeAndAcceptTransfer'
  | 'acceptTransfer'
  | 'rejectTransfer'
  | 'withdrawTransfer';

export interface TransferInput {
  /** For a proposal (and a transfer done at once): the office to move to. */
  readonly destinationOfficeId?: number;
  /** ISO; only `proposeTransfer` takes one. */
  readonly transferDate?: string;
  readonly note?: string;
}

/** An office a client may be transferred to. */
export interface OfficeOption {
  readonly id: number;
  readonly name: string;
}

export interface ClientReason {
  readonly id: number;
  readonly name: string;
}

export interface ClientApi {
  list(query: ClientQuery): Promise<ClientPage>;
  get(clientId: number): Promise<Client>;
  /** Creates a client and answers its id. */
  create(draft: ClientDraft): Promise<number>;
  /** Runs a lifecycle command on its date (and reason). */
  command(clientId: number, command: ClientCommand, input: ClientCommandInput): Promise<void>;
  /** The active reasons a command may give, in the administrator's order. */
  reasons(command: ReasonedCommand): Promise<readonly ClientReason[]>;
  /** The staff a client in `officeId` may be assigned to. */
  staffOptions(officeId: number): Promise<readonly StaffOption[]>;
  assignStaff(clientId: number, staffId: number): Promise<void>;
  /** The server wants the current holder's id to unassign them. */
  unassignStaff(clientId: number, staffId: number): Promise<void>;
  /** Every office, from the client template: it needs only READ_CLIENT. */
  transferOffices(): Promise<readonly OfficeOption[]>;
  /** Runs a transfer command, sending only the fields the server accepts for it. */
  transfer(clientId: number, command: TransferCommand, input: TransferInput): Promise<void>;
}

export const CLIENT_API = token<ClientApi>('ClientApi');
