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

import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';

import { AdapterProvider } from '@/core/adapters/AdapterProvider';
import type { AdapterOverride } from '@/core/adapters/registry';
import { APP_STORE } from '@/core/tokens';

import { createQueryClient } from '@/core/query/query-client';

import { createFakeAdapters } from './fake-adapters';

/**
 * Renders a component inside an AdapterProvider built from fakes, and the fakes' Redux store.
 * Returns the fakes alongside the render result, so a test can assert on what the component asked
 * an adapter for.
 */
export function renderWithAdapters(
  ui: ReactElement,
  { adapters = [], ...options }: { adapters?: readonly AdapterOverride[] } & RenderOptions = {},
) {
  const fakes = createFakeAdapters();
  const registry = fakes.registry(adapters);
  return {
    fakes,
    registry,
    ...render(
      <AdapterProvider registry={registry}>
        <Provider store={registry.resolve(APP_STORE)}>
          <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
        </Provider>
      </AdapterProvider>,
      options,
    ),
  };
}
