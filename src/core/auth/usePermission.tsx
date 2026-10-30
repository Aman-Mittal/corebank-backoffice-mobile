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

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { DEPLOYMENT_CONFIG } from '@/core/config/deployment-config';
import { useAppSelector } from '@/state/hooks';

import { ALL_FUNCTIONS, type Access } from './permissions';
import { selectGranted, selectPermitted } from './session-slice';

/** What every client-side gate sees while a deployment has switched them off. */
const UNGATED: readonly string[] = [ALL_FUNCTIONS];

/**
 * Whether the app's own gates are on. A deployment may switch them off (`rbacEnabled: false`);
 * the server still checks every request (DOCS/test-plan/P1-15-refusals-office-scope.md).
 */
function useGatesOn(): boolean {
  return useAdapter(DEPLOYMENT_CONFIG).get().rbacEnabled;
}

/** The signed-in user's permission codes; empty when signed out. All, with the gates off. */
export function useGranted(): readonly string[] {
  const granted = useAppSelector(selectGranted);
  return useGatesOn() ? granted : UNGATED;
}

/** Whether the signed-in user satisfies `access` (`null` = ungated). Re-renders on session change. */
export function usePermission(access: Access | null): boolean {
  const permitted = useAppSelector((state) => selectPermitted(state, access));
  return useGatesOn() ? permitted : true;
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
