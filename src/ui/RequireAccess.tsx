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

import type { Access } from '@/core/auth/permissions';
import { usePermission } from '@/core/auth/usePermission';

import { AccessDenied } from './AccessDenied';

/**
 * Renders the screen when the user is admitted, Access Denied otherwise. It never redirects: the
 * signed-out case is the `(app)` layout's job, so a visitor without a session is sent to sign-in
 * before this ever runs.
 */
export function RequireAccess({
  access,
  children,
}: {
  readonly access: Access | null;
  readonly children: ReactNode;
}) {
  const allowed = usePermission(access);
  if (allowed || access === null) return <>{children}</>;
  return <AccessDenied access={access} />;
}
