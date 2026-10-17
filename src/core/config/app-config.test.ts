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

import app from '../../../app.json';

describe('app.json', () => {
  it('gives expo-router a handoff origin, without which a release iOS build shows an alert', () => {
    // Expo Head alerts in a release build when no origin is configured; on iOS that alert sat
    // over sign-in and swallowed the next tap (the nightly `about` flow, 2026-10-17).
    const router = (app.expo.plugins as unknown[]).find(
      (p): p is [string, { origin?: string }] => Array.isArray(p) && p[0] === 'expo-router',
    );
    expect(router?.[1].origin).toMatch(/^https:\/\//);
  });
});
