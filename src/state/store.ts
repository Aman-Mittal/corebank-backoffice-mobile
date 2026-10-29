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

import { configureStore } from '@reduxjs/toolkit';

import { sessionSlice } from '@/core/auth/session-slice';
import { profileSlice } from '@/features/profile/profile-slice';

import type { ThunkExtra } from './thunk-extra';

/**
 * The app's one Redux store (ADR 0004): the session, and state that lives as long as it. Server
 * collections stay in TanStack Query.
 */
export function createAppStore(extra: ThunkExtra) {
  return configureStore({
    reducer: { session: sessionSlice.reducer, profile: profileSlice.reducer },
    middleware: (defaults) => defaults({ thunk: { extraArgument: extra } }),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
