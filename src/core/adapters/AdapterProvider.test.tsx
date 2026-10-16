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

import { act, render, screen } from '@testing-library/react';

import { createFakeAdapters } from '@/testing/fake-adapters';

import { AdapterProvider, useAdapter } from './AdapterProvider';
import { I18N } from './i18n/i18n.adapter';
import { createI18nextAdapter } from './i18n/i18next.adapter';
import { useI18n } from './i18n/useI18n';
import { provide } from './registry';

function Label() {
  const { t, language } = useI18n();
  return <span data-testid="label">{`${language}:${t('AUTH.SIGN_IN')}`}</span>;
}

describe('AdapterProvider / useAdapter / useI18n', () => {
  it('re-renders on a language change', async () => {
    const i18n = createI18nextAdapter('en');
    const registry = createFakeAdapters().registry([provide(I18N, i18n)]);
    render(
      <AdapterProvider registry={registry}>
        <Label />
      </AdapterProvider>,
    );
    expect(screen.getByTestId('label')).toHaveTextContent('en:Sign in');
    await act(() => i18n.setLanguage('hi'));
    expect(screen.getByTestId('label')).toHaveTextContent('hi:साइन इन करें');
  });

  it('fails loudly outside a provider', () => {
    function Orphan() {
      useAdapter(I18N);
      return null;
    }
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Orphan />)).toThrow(/outside <AdapterProvider>/);
  });
});
