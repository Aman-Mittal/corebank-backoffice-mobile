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

import type { OfficeDraft } from '@/core/adapters/api/office.api';
import { isoDateField } from '@/core/forms/date';

/** The office form. Messages are i18n keys. */
export const officeFormSchema = z.object({
  name: z.string().trim().min(1, 'FORM.REQUIRED'),
  /** Required to create; shown, not sent, when editing. */
  parentId: z.number().nullable(),
  openingDate: isoDateField,
  externalId: z.string().trim(),
});

/** Creating also needs a parent: every office but the head office has one. */
export const officeCreateSchema = officeFormSchema.extend({
  parentId: z
    .number()
    .nullable()
    .refine((v) => v !== null, 'FORM.REQUIRED'),
});

export type OfficeFormValues = z.input<typeof officeFormSchema>;

/** What the adapter is given. A blank external id is `null`, which the adapter omits. */
export function toOfficeDraft(values: z.output<typeof officeFormSchema>): OfficeDraft {
  return {
    name: values.name,
    parentId: values.parentId,
    openingDate: values.openingDate,
    externalId: values.externalId === '' ? null : values.externalId,
  };
}

/** Server parameter → form field, for showing a rejection under the field it names. */
export const OFFICE_SERVER_FIELDS = {
  name: 'name',
  parentId: 'parentId',
  openingDate: 'openingDate',
  externalId: 'externalId',
} as const;
