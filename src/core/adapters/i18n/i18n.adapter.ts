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

/** The languages shipped. Adding one means adding `src/i18n/locales/<code>.json`. */
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'ko'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Translation, stated as what screens need rather than as i18next.
 *
 * `translate()` returns the key itself when a translation is missing, never an empty string: a
 * blank label in a banking UI is indistinguishable from a field with no value, whereas a visible
 * `CLIENTS.CREATE` diagnoses itself (the same rule as fineract-backoffice-ui's `I18N`).
 */
export interface I18nAdapter {
  translate(key: string, params?: Record<string, string | number>): string;
  language(): Language;
  setLanguage(language: Language): Promise<void>;
  /** Calls `listener` after every language change. Returns the unsubscribe function. */
  subscribe(listener: (language: Language) => void): () => void;
}

export const I18N = token<I18nAdapter>('I18nAdapter');

/** Picks the first supported language from a preference list, falling back to English. */
export function pickLanguage(preferred: readonly (string | null | undefined)[]): Language {
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split(/[-_]/, 1)[0];
    const match = SUPPORTED_LANGUAGES.find((l) => l === base);
    if (match) return match;
  }
  return 'en';
}
