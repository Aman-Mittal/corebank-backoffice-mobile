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

import type { ReactNode } from 'react';

import { useAppSelector } from '@/state/hooks';

import type { Access } from './permissions';
import { selectGranted, selectPermitted } from './session-slice';

/** The signed-in user's permission codes; empty when signed out. */
export function useGranted(): readonly string[] {
  return useAppSelector(selectGranted);
}

/** Whether the signed-in user satisfies `access` (`null` = ungated). Re-renders on session change. */
export function usePermission(access: Access | null): boolean {
  return useAppSelector((state) => selectPermitted(state, access));
}

/** Renders `children` when permitted, otherwise `fallback` (nothing by default). */
export function Can({
  access,
  children,
  fallback = null,
}: {
  readonly access: Access | null;
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}) {
  return <>{usePermission(access) ? children : fallback}</>;
}
