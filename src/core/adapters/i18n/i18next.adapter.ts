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

import i18next, { type i18n } from 'i18next';

import en from '@/i18n/locales/en.json';
import hi from '@/i18n/locales/hi.json';
import ko from '@/i18n/locales/ko.json';

import type { I18nAdapter, Language } from './i18n.adapter';

/**
 * {@link I18nAdapter} over i18next. The only module allowed to import `i18next`.
 *
 * Catalogues are bundled rather than fetched: a phone opening offline must still have labels,
 * and three catalogues are small next to the JS bundle.
 */
export function createI18nextAdapter(initial: Language): I18nAdapter & { readonly instance: i18n } {
  const instance = i18next.createInstance();
  void instance.init({
    lng: initial,
    fallbackLng: 'en',
    resources: { en: { translation: en }, hi: { translation: hi }, ko: { translation: ko } },
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    initAsync: false,
  });
  return {
    instance,
    translate: (key, params) => {
      const value = instance.t(key, params ?? {});
      return typeof value === 'string' && value.length > 0 ? value : key;
    },
    language: () => instance.language as Language,
    setLanguage: async (language) => {
      await instance.changeLanguage(language);
    },
    subscribe(listener) {
      const handler = (lng: string) => listener(lng as Language);
      instance.on('languageChanged', handler);
      return () => instance.off('languageChanged', handler);
    },
  };
}
