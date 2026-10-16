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

import { useCallback, useSyncExternalStore } from 'react';

import { useAdapter } from '../AdapterProvider';
import { I18N } from './i18n.adapter';

/**
 * Translation for components, re-rendering on a language change.
 *
 * Returns `t` bound to the current language, so `t('ABOUT.TITLE')` in render is enough; the
 * subscription is what makes a language switch re-render without a reload.
 */
export function useI18n() {
  const i18n = useAdapter(I18N);
  const language = useSyncExternalStore(
    useCallback((onChange) => i18n.subscribe(onChange), [i18n]),
    () => i18n.language(),
    () => i18n.language(),
  );
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => i18n.translate(key, params),
    // `language` is a dependency on purpose: a new `t` per language re-renders memoised children.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n, language],
  );
  return { t, language, setLanguage: i18n.setLanguage };
}
