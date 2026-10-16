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
 * A field the server always sends, checked rather than defaulted.
 *
 * An entity with no id cannot be navigated to; defaulting it would route somewhere wrong, so it
 * fails loudly instead of plausibly.
 */
export function required<T>(value: T | undefined | null, entity: string, field: string): T {
  if (value === undefined || value === null) {
    throw new Error(`The server returned ${entity} with no ${field}`);
  }
  return value;
}
