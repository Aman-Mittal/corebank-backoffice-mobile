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

import { z } from 'zod';

import { isValidApiBaseUrl } from '@/core/config/runtime-config';

/**
 * The sign-in form, as a schema. Error messages are i18n keys; the screen translates them.
 * The server address is validated here because every credential typed next goes wherever it
 * points.
 */
export const loginSchema = z.object({
  server: z.string().trim().refine(isValidApiBaseUrl, 'AUTH.ERRORS.SERVER_INVALID'),
  tenant: z.string().trim().min(1, 'AUTH.ERRORS.REQUIRED'),
  username: z.string().trim().min(1, 'AUTH.ERRORS.REQUIRED'),
  password: z.string().min(1, 'AUTH.ERRORS.REQUIRED'),
});

export type LoginForm = z.infer<typeof loginSchema>;
