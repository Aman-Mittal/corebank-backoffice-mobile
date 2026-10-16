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

import { token } from '../registry';

/**
 * Time, as something a test can hold still.
 *
 * The idle lock, session expiry and "today" defaults on transaction forms all read the time.
 * Reading it through this rather than `Date.now()` is what lets a test assert that the lock
 * fires at exactly fifteen minutes without waiting fifteen minutes.
 */
export interface ClockAdapter {
  now(): number;
}

export const CLOCK = token<ClockAdapter>('ClockAdapter');

export const systemClock: ClockAdapter = { now: () => Date.now() };
