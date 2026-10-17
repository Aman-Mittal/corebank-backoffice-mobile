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

import { withoutBlanks } from './api-date';
import type {
  ClientIdentifier,
  ClientKycApi,
  ClientNote,
  DocumentType,
  IdentifierDraft,
  IdentifierStatus,
} from './client-kyc.api';
import { required } from './required';

/** `ClientIdentifierData`, as the server sends it. */
export interface IdentifierPayload {
  readonly id?: number;
  readonly documentType?: { readonly id?: number; readonly name?: string };
  readonly documentKey?: string;
  readonly description?: string;
  readonly status?: string;
}

/** `NoteData`, as the server sends it: `createdOn` is an ISO date-time with offset. */
export interface NotePayload {
  readonly id?: number;
  readonly note?: string;
  readonly createdByUsername?: string;
  readonly createdOn?: string;
}

/** A code value (`CodeValueData`). */
interface CodeValuePayload {
  readonly id?: number;
  readonly name?: string;
  readonly position?: number;
  readonly active?: boolean;
}

const STATUSES: Record<string, IdentifierStatus> = {
  'clientIdentifierStatusType.active': 'active',
  'clientIdentifierStatusType.inactive': 'inactive',
};

/** Exported for its own test: this is where upstream drift surfaces. */
export function mapIdentifier(payload: IdentifierPayload): ClientIdentifier {
  return {
    id: required(payload.id, 'client identifier', 'id'),
    documentTypeId: payload.documentType?.id ?? null,
    documentTypeName: payload.documentType?.name ?? '',
    documentKey: payload.documentKey ?? '',
    description: payload.description || null,
    status: (payload.status !== undefined && STATUSES[payload.status]) || 'unknown',
  };
}

export function mapNote(payload: NotePayload): ClientNote {
  return {
    id: required(payload.id, 'note', 'id'),
    note: payload.note ?? '',
    createdBy: payload.createdByUsername ?? '',
    createdOn: payload.createdOn ?? null,
  };
}

/** Newest first; a note without a date sorts last, then by id, newest first. */
const newestFirst = (a: ClientNote, b: ClientNote) =>
  (b.createdOn ?? '').localeCompare(a.createdOn ?? '') || b.id - a.id;

export class HttpClientKycApi implements ClientKycApi {
  constructor(private readonly client: ApiClient) {}

  async identifiers(clientId: number): Promise<readonly ClientIdentifier[]> {
    const list = await call(
      this.client.GET('/v1/clients/{clientId}/identifiers', { params: { path: { clientId } } }),
    );
    return ((list ?? []) as IdentifierPayload[]).map(mapIdentifier);
  }

  async documentTypes(clientId: number): Promise<readonly DocumentType[]> {
    const template = await call(
      this.client.GET('/v1/clients/{clientId}/identifiers/template', {
        params: { path: { clientId } },
      }),
    );
    const types = ((template as { allowedDocumentTypes?: CodeValuePayload[] } | undefined)
      ?.allowedDocumentTypes ?? []) as CodeValuePayload[];
    return types
      .filter((t) => t.active !== false && t.id !== undefined)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((t) => ({ id: required(t.id, 'document type', 'id'), name: t.name ?? '' }));
  }

  async addIdentifier(clientId: number, draft: IdentifierDraft): Promise<number> {
    const response = await call(
      this.client.POST('/v1/clients/{clientId}/identifiers', {
        params: { path: { clientId } },
        body: withoutBlanks({
          documentTypeId: draft.documentTypeId,
          documentKey: draft.documentKey.trim(),
          description: draft.description?.trim(),
          status: 'Active',
        }),
      }),
    );
    return required(response?.resourceId, 'identifier create response', 'id');
  }

  async deleteIdentifier(clientId: number, identifierId: number): Promise<void> {
    await call(
      this.client.DELETE('/v1/clients/{clientId}/identifiers/{identifierId}', {
        params: { path: { clientId, identifierId } },
      }),
    );
  }

  async notes(clientId: number): Promise<readonly ClientNote[]> {
    const list = await call(
      this.client.GET('/v1/{resourceType}/{resourceId}/notes', {
        params: { path: { resourceType: 'clients', resourceId: clientId } },
      }),
    );
    // A new array, so sorting in place mutates nothing the caller holds.
    return ((list ?? []) as NotePayload[]).map(mapNote).sort(newestFirst);
  }

  async addNote(clientId: number, note: string): Promise<number> {
    const response = await call(
      this.client.POST('/v1/{resourceType}/{resourceId}/notes', {
        params: { path: { resourceType: 'clients', resourceId: clientId } },
        body: { note: note.trim() },
      }),
    );
    // Declared only as a `default` response, which the generated client types as `never`.
    const created = response as { readonly resourceId?: number } | undefined;
    return required(created?.resourceId, 'note create response', 'id');
  }

  async updateNote(clientId: number, noteId: number, note: string): Promise<void> {
    await call(
      this.client.PUT('/v1/{resourceType}/{resourceId}/notes/{noteId}', {
        params: { path: { resourceType: 'clients', resourceId: clientId, noteId } },
        body: { note: note.trim() },
      }),
    );
  }

  async deleteNote(clientId: number, noteId: number): Promise<void> {
    await call(
      this.client.DELETE('/v1/{resourceType}/{resourceId}/notes/{noteId}', {
        params: { path: { resourceType: 'clients', resourceId: clientId, noteId } },
      }),
    );
  }
}
