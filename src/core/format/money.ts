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

import type { Currency } from '@/core/adapters/api/client-charge.api';

/**
 * An amount in the user's language, with exactly the currency's decimal places: 100 USD reads
 * "100.00", never "100". The currency code is the caller's to show, once per row, not per amount.
 */
export function formatMoney(amount: number, currency: Currency, language: string): string {
  const places = currency.decimalPlaces;
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  }).format(amount);
}

/**
 * Reads an amount typed as plain digits with an optional decimal point ("12.5"), above zero and
 * with no more decimal places than the currency has. Anything else is `null`: grouping
 * separators and signs are refused rather than guessed at.
 */
export function parseAmount(text: string, decimalPlaces: number): number | null {
  const trimmed = text.trim();
  const point = trimmed.indexOf('.');
  const whole = point === -1 ? trimmed : trimmed.slice(0, point);
  const fraction = point === -1 ? '' : trimmed.slice(point + 1);
  const digits = /^\d+$/;
  if (!digits.test(whole)) return null;
  if (point !== -1 && (!digits.test(fraction) || fraction.length > decimalPlaces)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
}
