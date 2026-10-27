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

/** Where the clients list is: a zero-based page, under a search (`''` for none). */
export interface ClientListPosition {
  readonly page: number;
  readonly search: string;
}

/**
 * The list's URL query: `?page=2&q=ada`, page one-based. A type alias, not an interface: route
 * params must be assignable to expo-router's string-indexed params.
 */
export type ClientListParams = {
  readonly page?: string;
  readonly q?: string;
};

/**
 * Reads the position from the URL. A page that is not a whole number of at least 1 is the
 * first page, so a hand-edited link still opens the list.
 */
export function readListParams(params: ClientListParams): ClientListPosition {
  const page = Number(params.page);
  return {
    page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
    search: params.q?.trim() ?? '',
  };
}

/** The URL query for a position. Defaults are left out, so the first page is plain `/clients`. */
export function toListParams({ page, search }: ClientListPosition): ClientListParams {
  return {
    page: page > 0 ? String(page + 1) : undefined,
    q: search === '' ? undefined : search,
  };
}

/** The last page that has rows; 0 for an empty list. */
export const lastPage = (total: number, pageSize: number) =>
  Math.max(0, Math.ceil(total / pageSize) - 1);
