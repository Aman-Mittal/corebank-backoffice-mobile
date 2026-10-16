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

import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const src = fileURLToPath(new URL('./src', import.meta.url));

/**
 * Two projects, split by what a test needs from its environment rather than by folder.
 *
 * - `node`: adapters, mappers, the HTTP pipeline and the repository scripts. No DOM and no React
 *   Native. Native-only modules (MMKV, SecureStore) are mocked at the module boundary, which is
 *   the adapter boundary, so what is under test is our code and not theirs.
 * - `web`: components, hooks and the browser implementations of adapters (`*.dom.test.ts`),
 *   rendered through react-native-web into jsdom. This is the same
 *   component tree the web target ships. On-device behaviour is covered by Maestro, not here.
 *
 * Vitest does not run React Native's own Flow-typed sources, so a `*.test.tsx` that needs a
 * native-only component is the wrong level of test: write a Maestro flow instead.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/api/generated/**', 'src/testing/**', 'src/app/**', '**/*.test.{ts,tsx}'],
      thresholds: {
        lines: 80,
        branches: 75,
        'src/core/**': { lines: 90, branches: 85 },
      },
    },
    projects: [
      {
        resolve: { alias: { '@': src } },
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
          exclude: ['src/**/*.dom.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: [
            { find: '@', replacement: src },
            { find: /^react-native$/, replacement: 'react-native-web' },
          ],
          extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.js', '.mjs', '.json'],
        },
        define: { __DEV__: true },
        test: {
          name: 'web',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.tsx', 'src/**/*.dom.test.ts'],
          setupFiles: ['src/testing/setup-web.ts'],
        },
      },
    ],
  },
});
