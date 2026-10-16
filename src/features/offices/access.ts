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

import type { Access } from '@/core/auth/permissions';

/**
 * What each offices screen requires (DOCS/test-plan/P1-04-offices-staff.md). The routes guard
 * with these and the screens show a control only when its target would admit the user, from the
 * same values, so the two cannot disagree.
 */
export const OFFICE_ACCESS = {
  read: { anyOf: ['READ_OFFICE'] },
  create: { anyOf: ['CREATE_OFFICE'] },
  update: { anyOf: ['UPDATE_OFFICE'] },
} as const satisfies Record<string, Access>;
