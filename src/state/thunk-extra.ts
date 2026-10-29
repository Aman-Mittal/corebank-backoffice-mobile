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

import type { AdapterToken } from '@/core/adapters/registry';

/**
 * What a thunk is given to reach the outside world: the adapter registry's `resolve`, so a thunk
 * asks for `PROFILE_API` exactly as a hook asks `useAdapter`, and a test's fakes stand in.
 */
export interface ThunkExtra {
  readonly resolve: <T>(token: AdapterToken<T>) => T;
}
