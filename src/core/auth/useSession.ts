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

import { useSyncExternalStore } from 'react';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { SESSION } from '@/core/tokens';

import type { SessionState, SessionStore } from './session-store';

/** The current session state, re-rendering on every change. */
export function useSession(): SessionState & { readonly store: SessionStore } {
  const store = useAdapter(SESSION);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return { ...state, store };
}
