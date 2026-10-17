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

/**
 * Every failure the API layer can report, as one typed value.
 *
 * Screens branch on `kind`, never on a status code or a message string. The classification
 * rules are carried over from fineract-backoffice-ui's `errorInterceptor`.
 */
export type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'domainRule'
  | 'validation'
  | 'notFound'
  | 'server';

/** One problem the server named, with the parameter it rejected when there is one. */
export interface FieldMessage {
  readonly field: string | null;
  readonly message: string;
  /**
   * The error's own globalisation code (`error.msg.clientIdentifier.identityKey.duplicate`). Some
   * refusals name no usable field (`parameterName: "id"`), and the code is what says which field
   * they are about.
   */
  readonly code?: string | null;
}

export class AppError extends Error {
  constructor(
    readonly kind: AppErrorKind,
    readonly status: number,
    /** The server's top-level message, when it gave one. */
    readonly summary: string | null,
    readonly messages: readonly FieldMessage[],
    readonly correlationId: string | null = null,
  ) {
    super(summary ?? messages[0]?.message ?? kind);
    this.name = 'AppError';
  }
}

/** The server's code for "the request was understood and the business rules say no". */
const DOMAIN_RULE_VIOLATION = 'validation.msg.domain.rule.violation';

type ErrorBody = {
  readonly userMessageGlobalisationCode?: string;
  readonly defaultUserMessage?: string;
  readonly developerMessage?: string;
  readonly errors?: readonly Record<string, unknown>[];
} | null;

/**
 * Some commands wrap the real per-field error one level deeper, behind a generic outer entry
 * (`parameterName: "id"`, "Validation errors exist."); the reason sits at `args[0].value`.
 */
function unwrapNested(err: Record<string, unknown>): Record<string, unknown> {
  const args = err['args'];
  const nested = Array.isArray(args)
    ? (args[0] as { value?: unknown } | undefined)?.value
    : undefined;
  if (
    nested &&
    typeof nested === 'object' &&
    ('developerMessage' in nested || 'defaultUserMessage' in nested)
  ) {
    return nested as Record<string, unknown>;
  }
  return err;
}

function fieldMessages(body: ErrorBody): FieldMessage[] {
  if (!body || !Array.isArray(body.errors)) return [];
  return body.errors.map((raw) => {
    const err = unwrapNested(raw);
    const message =
      (err['developerMessage'] as string | undefined) ||
      (err['defaultUserMessage'] as string | undefined) ||
      'Validation error';
    const field = typeof err['parameterName'] === 'string' ? err['parameterName'] : null;
    const code = err['userMessageGlobalisationCode'];
    return { field, message, code: typeof code === 'string' ? code : null };
  });
}

/**
 * Classifies a failed response.
 *
 * 403 means two unrelated things: the caller lacks a permission, or the operation is not
 * allowed in this state. A domain-rule refusal names itself (its globalisation code, or a
 * populated `errors[]`) and carries the only statement of the reason, so it is kept apart from
 * an authorization refusal, whose body is backend vocabulary the user cannot act on.
 */
export function toAppError(
  status: number,
  rawBody: unknown,
  correlationId: string | null = null,
): AppError {
  const body = (rawBody && typeof rawBody === 'object' ? rawBody : null) as ErrorBody;
  const messages = fieldMessages(body);
  const summary = body?.defaultUserMessage || body?.developerMessage || null;

  const kind: AppErrorKind = (() => {
    if (status === 401) return 'unauthorized';
    if (status === 403) {
      return body?.userMessageGlobalisationCode === DOMAIN_RULE_VIOLATION || messages.length > 0
        ? 'domainRule'
        : 'forbidden';
    }
    if (status === 404) return 'notFound';
    if (status === 400) return 'validation';
    if (status === 408) return 'timeout';
    return 'server';
  })();

  return new AppError(kind, status, kind === 'forbidden' ? null : summary, messages, correlationId);
}

/** Classifies a thrown value from `fetch` (no response at all). */
export function toNetworkError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const timeout = error instanceof Error && error.name === 'RequestTimeoutError';
  return new AppError(timeout ? 'timeout' : 'network', 0, null, []);
}
