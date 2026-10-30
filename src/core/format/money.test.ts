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

import { formatMoney, parseAmount } from './money';

const USD = { code: 'USD', decimalPlaces: 2 };

describe('formatMoney', () => {
  it("shows exactly the currency's decimal places", () => {
    expect(formatMoney(100, USD, 'en')).toBe('100.00');
    expect(formatMoney(25.5, USD, 'en')).toBe('25.50');
    expect(formatMoney(1234.5, USD, 'en')).toBe('1,234.50');
    expect(formatMoney(1500, { code: 'UGX', decimalPlaces: 0 }, 'en')).toBe('1,500');
  });

  it('keeps the sign of a negative amount', () => {
    expect(formatMoney(-3, USD, 'en')).toBe('-3.00');
  });
});

describe('parseAmount', () => {
  it('reads plain amounts above zero', () => {
    expect(parseAmount(' 12.5 ', 2)).toBe(12.5);
    expect(parseAmount('80', 2)).toBe(80);
  });

  it('refuses zero, blanks, signs, separators and extra decimal places', () => {
    for (const text of ['', ' ', '0', '0.00', '-5', '1,000', '1.234', 'ten', '1.']) {
      expect(parseAmount(text, 2)).toBeNull();
    }
    expect(parseAmount('5.5', 0)).toBeNull();
  });
});
