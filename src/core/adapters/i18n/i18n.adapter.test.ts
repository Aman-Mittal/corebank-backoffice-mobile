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

import en from '@/i18n/locales/en.json';
import hi from '@/i18n/locales/hi.json';
import ko from '@/i18n/locales/ko.json';

import { pickLanguage } from './i18n.adapter';
import { createI18nextAdapter } from './i18next.adapter';

const keys = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe('pickLanguage', () => {
  it.each([
    [['ko-KR'], 'ko'],
    [['fr-FR', 'hi-IN'], 'hi'],
    [[null, 'en_GB'], 'en'],
    [['xx'], 'en'],
    [[], 'en'],
  ] as const)('%j → %s', (prefs, lang) => expect(pickLanguage(prefs)).toBe(lang));
});

describe('i18next adapter', () => {
  it('translates, interpolates, and switches language', async () => {
    const i18n = createI18nextAdapter('en');
    expect(i18n.translate('ABOUT.VERSION', { version: '1.2.3' })).toBe('Version 1.2.3');
    const seen: string[] = [];
    i18n.subscribe((l) => seen.push(l));
    await i18n.setLanguage('ko');
    expect(i18n.language()).toBe('ko');
    expect(i18n.translate('AUTH.SIGN_IN')).toBe('로그인');
    expect(seen).toEqual(['ko']);
  });

  it('returns the key itself for a missing translation', () => {
    expect(createI18nextAdapter('en').translate('NO.SUCH.KEY')).toBe('NO.SUCH.KEY');
  });

  it('ships the same keys in every catalogue', () => {
    expect(keys(hi).toSorted()).toEqual(keys(en).toSorted());
    expect(keys(ko).toSorted()).toEqual(keys(en).toSorted());
  });
});
