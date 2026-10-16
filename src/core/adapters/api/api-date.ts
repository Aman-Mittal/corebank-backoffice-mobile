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
 * Converts the date forms the core-banking API sends into ISO `YYYY-MM-DD`, once.
 *
 * Carried over from fineract-backoffice-ui (`toIsoFineractDate`). The OpenAPI document declares
 * every `LocalDate` as `string`; the server sends `[year, month, day]` with a 1-based month for
 * most of them and a real string for some (`GET /staff/{id}`'s `joiningDate`). A screen cannot
 * tell from the type which it is getting, and should not have to: this accepts both.
 *
 * Returns `null`, never a placeholder: "no date" and "a date we failed to read" must stay
 * distinguishable, and turning `null` into a dash is the view's job.
 */
export function toIsoApiDate(value: string | readonly number[] | undefined | null): string | null {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    const [year, month, day] = value;
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      (month as number) < 1 ||
      (month as number) > 12 ||
      (day as number) < 1 ||
      (day as number) > 31
    ) {
      return null;
    }
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (typeof value !== 'string' || value === '') return null;
  const datePart = value.split('T', 1)[0] ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
}

/**
 * The fields the server needs to parse a date out of a request body.
 *
 * It parses strictly against the `dateFormat` it is told, so a body with a date and no format
 * fails to parse and answers 500. Adapters spread this into every dated write; screens never
 * set it (rule 2 of DOCS/ADAPTERS.md).
 */
export const ISO_DATE_FIELDS = { dateFormat: 'yyyy-MM-dd', locale: 'en' } as const;

/**
 * Drops keys whose value is `undefined`, `null` or a blank string.
 *
 * Sending `mobileNo: ''` is not an omission to the server: it rejects the whole submission with
 * a validation error on a field the user left empty. Adapters promise to omit blanks instead.
 */
export function withoutBlanks<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
