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

// @ts-check
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const unicorn = require('eslint-plugin-unicorn').default;
const security = require('eslint-plugin-security');
const importPlugin = require('eslint-plugin-import');
const testingLibrary = require('eslint-plugin-testing-library');

const cognitiveComplexity = require('./eslint-rules/cognitive-complexity.js');
const noVendorUiImport = require('./eslint-rules/no-vendor-ui-import.js');
const noGeneratedApiImport = require('./eslint-rules/no-generated-api-import.js');

/**
 * Lint policy. Every plugin here is MIT or Apache-2.0; DOCS/LINT_POLICY.md has the reasoning.
 *
 * `eslint-plugin-sonarjs` is deliberately absent: it is LGPL-3.0-only, an ASF Category X licence.
 * `local/cognitive-complexity` replaces its most-used rule at the same threshold (ported, with its
 * exact-score tests, from fineract-backoffice-ui). Deeper Sonar analysis runs server-side on
 * SonarCloud, which is a service rather than a dependency; see DOCS/SONAR.md.
 *
 * Three local boundaries, each on its own rule id so their suppression counts ratchet separately:
 * - `local/no-generated-api-import`: the generated OpenAPI types stay in `src/core/adapters/api`.
 * - `local/no-vendor-ui-import`: UI primitive libraries stay in `src/ui`.
 * - `no-restricted-imports`: each library adapter is the only importer of the library it wraps.
 */
const local = {
  rules: {
    'cognitive-complexity': cognitiveComplexity,
    'no-vendor-ui-import': noVendorUiImport,
    'no-generated-api-import': noGeneratedApiImport,
  },
};

/** Library → the one place allowed to import it. */
const ADAPTED_LIBRARIES = [
  { name: 'react-native-mmkv', allowedIn: 'src/core/adapters/storage/' },
  { name: 'expo-secure-store', allowedIn: 'src/core/adapters/secure-storage/' },
  { name: 'expo-sharing', allowedIn: 'src/core/adapters/download/' },
  { name: 'expo-file-system', allowedIn: 'src/core/adapters/download/' },
  { name: 'i18next', allowedIn: 'src/core/adapters/i18n/' },
  { name: '@react-native-community/netinfo', allowedIn: 'src/core/adapters/network/' },
  { name: 'openapi-fetch', allowedIn: 'src/core/http/' },
];

const adaptedImportRule = [
  'error',
  {
    paths: ADAPTED_LIBRARIES.map(({ name, allowedIn }) => ({
      name,
      message: `Reach ${name} through its adapter (${allowedIn}). See DOCS/ADAPTERS.md.`,
    })),
  },
];

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'api-spec/**',
      'src/api/generated/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'playwright-report/**',
      'expo-env.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.strict,
      unicorn.configs.unopinionated,
      security.configs.recommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    plugins: { local, react, 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { typescript: { alwaysTryTypes: true, project: ['tsconfig.json'] } },
      // Platform files are resolved by Metro, not by the import plugin.
      'import/ignore': ['react-native'],
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'local/cognitive-complexity': ['error', { threshold: 15 }],
      'local/no-generated-api-import': [
        'error',
        {
          dir: 'src/api/generated',
          aliases: { '@/': 'src/' },
          message: 'Map it to a domain model in src/core/adapters/api (DOCS/ADAPTERS.md).',
        },
      ],
      'local/no-vendor-ui-import': [
        'error',
        {
          patterns: ['@rn-primitives/*', 'nativewind'],
          message: 'Use the primitives in src/ui (DOCS/adr/0003-ui-boundary.md).',
        },
      ],
      'no-restricted-imports': adaptedImportRule,
      // Storage is a trust boundary reached through globals, so it needs its own rule.
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use the STORAGE adapter (src/core/adapters).' },
        { name: 'sessionStorage', message: 'Use STORAGE or SECURE_STORAGE (src/core/adapters).' },
      ],
      // Off: reports every `obj[key]` with a non-literal key, the normal way to read a typed map.
      'security/detect-object-injection': 'off',
      // Off: `globalThis.localStorage` is how the web storage adapter reaches it, and enforcing
      // this would let a bare global slip past `no-restricted-globals` above.
      'unicorn/prefer-global-this': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-useless-undefined': 'off',
      // Off: Expo Router and Metro resolve `@/` and platform suffixes; TypeScript already checks.
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    // The adapters own their library, the API adapters own the generated types, and the
    // composition root (`app-registry.ts`) wires both.
    files: ['src/core/adapters/**', 'src/core/http/**', 'src/core/app-registry.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-globals': 'off' },
  },
  {
    files: ['src/core/adapters/api/**', 'src/core/http/client.ts'],
    rules: { 'local/no-generated-api-import': 'off' },
  },
  { files: ['src/ui/**'], rules: { 'local/no-vendor-ui-import': 'off' } },
  {
    files: ['**/*.web.tsx'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-globals': 'off',
    },
  },
  {
    files: ['src/testing/**', 'e2e/**'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Playwright fixtures take a parameter named `use`; they are not React hooks.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    // Playwright loads its TypeScript config as CommonJS, where `__dirname` is the only option.
    files: ['e2e/web/playwright.config.ts'],
    rules: { 'unicorn/prefer-module': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { 'no-undef': 'off' },
  },
  { files: ['**/*.mjs'], languageOptions: { sourceType: 'module' } },
);
