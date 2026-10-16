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

import type { StaffDraft, StaffUpdate } from '@/core/adapters/api/staff.api';
import { isoDateField } from '@/core/forms/date';

const optionalText = z.string().trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The staff form. Messages are i18n keys. */
export const staffFormSchema = z.object({
  officeId: z
    .number()
    .nullable()
    .refine((v) => v !== null, 'FORM.REQUIRED'),
  firstname: z.string().trim().min(1, 'FORM.REQUIRED'),
  lastname: z.string().trim().min(1, 'FORM.REQUIRED'),
  mobileNo: optionalText.refine((v) => /^\d*$/.test(v), 'FORM.DIGITS_ONLY'),
  emailAddress: optionalText.refine((v) => v === '' || EMAIL.test(v), 'FORM.EMAIL_INVALID'),
  externalId: optionalText,
  joiningDate: isoDateField,
  isLoanOfficer: z.boolean(),
  isActive: z.boolean(),
});

export type StaffFormValues = z.input<typeof staffFormSchema>;
type Parsed = z.output<typeof staffFormSchema>;

const orNull = (v: string) => (v === '' ? null : v);

/** What creating sends. Blank optionals become `null`, which the adapter omits. */
export function toStaffDraft(v: Parsed): StaffDraft {
  return {
    officeId: v.officeId as number,
    firstname: v.firstname,
    lastname: v.lastname,
    mobileNo: orNull(v.mobileNo),
    emailAddress: orNull(v.emailAddress),
    externalId: orNull(v.externalId),
    isLoanOfficer: v.isLoanOfficer,
    isActive: v.isActive,
    joiningDate: v.joiningDate,
  };
}

/** What editing sends: never the office or the joining date (DOCS/test-plan/P1-04). */
export function toStaffUpdate(v: Parsed): StaffUpdate {
  return {
    firstname: v.firstname,
    lastname: v.lastname,
    mobileNo: orNull(v.mobileNo),
    externalId: orNull(v.externalId),
    isLoanOfficer: v.isLoanOfficer,
    isActive: v.isActive,
  };
}

/** Server parameter → form field. */
export const STAFF_SERVER_FIELDS = {
  officeId: 'officeId',
  firstname: 'firstname',
  lastname: 'lastname',
  mobileNo: 'mobileNo',
  emailAddress: 'emailAddress',
  externalId: 'externalId',
  joiningDate: 'joiningDate',
} as const;
