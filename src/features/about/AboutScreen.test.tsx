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

import { screen } from '@testing-library/react';

import { I18N } from '@/core/adapters/i18n/i18n.adapter';
import { createI18nextAdapter } from '@/core/adapters/i18n/i18next.adapter';
import { provide } from '@/core/adapters/registry';
import { renderWithAdapters } from '@/testing/render';

import { TID } from '../../../e2e/shared/testids';
import { AboutScreen } from './AboutScreen';

vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '9.8.7' } } }));

describe('AboutScreen', () => {
  it('renders the disclaimer, licence and version through the I18N adapter', () => {
    renderWithAdapters(<AboutScreen />);
    // The fake I18N echoes keys, so this asserts which keys the screen chose.
    expect(screen.getByTestId(TID.about.disclaimer)).toHaveTextContent('ABOUT.DISCLAIMER');
    expect(screen.getByTestId(TID.about.license)).toHaveTextContent('ABOUT.LICENSE');
    expect(screen.getByTestId(TID.about.version)).toHaveTextContent('ABOUT.VERSION(version=9.8.7)');
  });

  it('shows the real disclaimer text in Korean when the language is Korean', () => {
    renderWithAdapters(<AboutScreen />, { adapters: [provide(I18N, createI18nextAdapter('ko'))] });
    expect(screen.getByTestId(TID.about.disclaimer)).toHaveTextContent(
      /Apache Software Foundation 프로젝트가 아니며/,
    );
  });
});
