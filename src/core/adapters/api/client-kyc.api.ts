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

/** Read from the status code (`clientIdentifierStatusType.active`), never a label. */
export type IdentifierStatus = 'active' | 'inactive' | 'unknown';

/** An identity document on a client. */
export interface ClientIdentifier {
  readonly id: number;
  readonly documentTypeId: number | null;
  readonly documentTypeName: string;
  readonly documentKey: string;
  readonly description: string | null;
  readonly status: IdentifierStatus;
}

/** A document type an identifier may have (a value of the code an administrator fills). */
export interface DocumentType {
  readonly id: number;
  readonly name: string;
}

/** What adding an identifier collects. The adapter adds the status. */
export interface IdentifierDraft {
  readonly documentTypeId: number;
  readonly documentKey: string;
  readonly description?: string | null;
}

export interface ClientNote {
  readonly id: number;
  readonly note: string;
  /** The author's username; empty when the server does not say. */
  readonly createdBy: string;
  /** ISO date-time with offset, as sent; `null` when absent. */
  readonly createdOn: string | null;
}

/** A client's identifiers and notes (DOCS/test-plan/P1-07-client-kyc.md). */
export interface ClientKycApi {
  identifiers(clientId: number): Promise<readonly ClientIdentifier[]>;
  /** The active document types, in the administrator's order. */
  documentTypes(clientId: number): Promise<readonly DocumentType[]>;
  /** Adds an identifier and answers its id. */
  addIdentifier(clientId: number, draft: IdentifierDraft): Promise<number>;
  deleteIdentifier(clientId: number, identifierId: number): Promise<void>;
  /** Newest first. */
  notes(clientId: number): Promise<readonly ClientNote[]>;
  /** Adds a note and answers its id. */
  addNote(clientId: number, note: string): Promise<number>;
  updateNote(clientId: number, noteId: number, note: string): Promise<void>;
  deleteNote(clientId: number, noteId: number): Promise<void>;
}

export const CLIENT_KYC_API = token<ClientKycApi>('ClientKycApi');
