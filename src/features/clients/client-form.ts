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

import type { ClientDraft, LegalForm } from '@/core/adapters/api/client.api';
import { isRealIsoDate } from '@/core/forms/date';

const text = z.string().trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The client form. Messages are i18n keys. Which names are required depends on the legal form,
 * and the activation date only matters while Active is checked, so both are checked together.
 */
export const clientFormSchema = z
  .object({
    legalForm: z.enum(['person', 'entity']),
    officeId: z
      .number()
      .nullable()
      .refine((v) => v !== null, 'FORM.REQUIRED'),
    firstname: text,
    middlename: text,
    lastname: text,
    fullname: text,
    submittedOnDate: text.refine(isRealIsoDate, 'FORM.DATE_INVALID'),
    active: z.boolean(),
    activationDate: text,
    externalId: text,
    mobileNo: text.refine((v) => /^\d*$/.test(v), 'FORM.DIGITS_ONLY'),
    emailAddress: text.refine((v) => v === '' || EMAIL.test(v), 'FORM.EMAIL_INVALID'),
  })
  .superRefine((v, ctx) => {
    const require = (path: 'firstname' | 'lastname' | 'fullname') => {
      if (v[path] === '') ctx.addIssue({ code: 'custom', path: [path], message: 'FORM.REQUIRED' });
    };
    if (v.legalForm === 'person') {
      require('firstname');
      require('lastname');
    } else {
      require('fullname');
    }
    if (v.active && !isRealIsoDate(v.activationDate)) {
      ctx.addIssue({ code: 'custom', path: ['activationDate'], message: 'FORM.DATE_INVALID' });
    }
  });

export type ClientFormValues = z.input<typeof clientFormSchema>;
type Parsed = z.output<typeof clientFormSchema>;

const orNull = (v: string) => (v === '' ? null : v);

/**
 * What creating sends: only the chosen legal form's names, and an activation date only for an
 * active client. Blank optionals become `null`, which the adapter omits.
 */
export function toClientDraft(v: Parsed): ClientDraft {
  const common = {
    officeId: v.officeId as number,
    submittedOnDate: v.submittedOnDate,
    externalId: orNull(v.externalId),
    mobileNo: orNull(v.mobileNo),
    emailAddress: orNull(v.emailAddress),
  };
  const names =
    v.legalForm === 'person'
      ? {
          legalForm: 'person' as const,
          firstname: v.firstname,
          middlename: orNull(v.middlename),
          lastname: v.lastname,
        }
      : { legalForm: 'entity' as const, fullname: v.fullname };
  const activation = v.active
    ? { active: true as const, activationDate: v.activationDate }
    : { active: false as const };
  return { ...common, ...names, ...activation };
}

/** The defaults: a person, active from today, submitted today. */
export function emptyClientForm(today: string): ClientFormValues {
  return {
    legalForm: 'person' satisfies LegalForm,
    officeId: null,
    firstname: '',
    middlename: '',
    lastname: '',
    fullname: '',
    submittedOnDate: today,
    active: true,
    activationDate: today,
    externalId: '',
    mobileNo: '',
    emailAddress: '',
  };
}

/** Server parameter → form field. */
export const CLIENT_SERVER_FIELDS = {
  officeId: 'officeId',
  legalFormId: 'legalForm',
  firstname: 'firstname',
  middlename: 'middlename',
  lastname: 'lastname',
  fullname: 'fullname',
  submittedOnDate: 'submittedOnDate',
  activationDate: 'activationDate',
  externalId: 'externalId',
  mobileNo: 'mobileNo',
  emailAddress: 'emailAddress',
} as const;
