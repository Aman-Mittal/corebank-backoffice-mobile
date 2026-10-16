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

import { AppError } from './app-error';

/** A failed write, split into what belongs under a form field and what belongs above the form. */
export interface FormFailure<F extends string> {
  readonly fields: Partial<Record<F, string>>;
  /** A message for the whole form, or `null` when every message found a field. */
  readonly form: string | null;
}

/**
 * Maps a rejected write onto a form.
 *
 * `fields` maps the server's parameter names onto the form's own (`mobileNo` → `mobile`). A
 * message naming a parameter the form does not show, or naming none, is kept for the form-level
 * error rather than dropped: the server's reason is the only statement of what went wrong.
 * Anything that is not an `AppError` (a bug, not a refusal) gets `fallback`.
 */
export function formFailure<F extends string>(
  error: unknown,
  fields: Readonly<Record<string, F>>,
  fallback: string,
): FormFailure<F> {
  if (!(error instanceof AppError)) return { fields: {}, form: fallback };
  const out: Partial<Record<F, string>> = {};
  const unplaced: string[] = [];
  for (const { field, message } of error.messages) {
    const target = field === null ? undefined : fields[field];
    if (target && !out[target]) out[target] = message;
    else if (!target) unplaced.push(message);
  }
  const placed = Object.keys(out).length > 0;
  const form = unplaced[0] ?? (placed ? null : (error.summary ?? fallback));
  return { fields: out, form };
}
