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

import type { Page } from '@playwright/test';

import { LoginPage } from '../pages/login.page';
import { authResponse, mockApi, type Handler } from './api';
import { OFFICES } from './organization';

/** The permission sets the RBAC scenarios sign in with (DOCS/test-plan/P1-02-shell-rbac.md). */
export const PERSONAS = {
  superuser: ['ALL_FUNCTIONS'],
  clerk: ['READ_CLIENT'],
  creator: ['READ_CLIENT', 'CREATE_CLIENT'],
  reader: ['ALL_FUNCTIONS_READ'],
  loanOfficer: ['READ_LOAN'],
  nobody: [],
  junk: ['NOT_A_REAL_CODE'],
  officeAdmin: ['READ_OFFICE', 'CREATE_OFFICE', 'UPDATE_OFFICE'],
  officeReader: ['READ_OFFICE'],
  staffAdmin: ['READ_STAFF', 'CREATE_STAFF', 'UPDATE_STAFF', 'READ_OFFICE'],
  staffReader: ['READ_STAFF'],
  clientAdmin: [
    'READ_CLIENT',
    'CREATE_CLIENT',
    'ACTIVATE_CLIENT',
    'REJECT_CLIENT',
    'WITHDRAW_CLIENT',
    'CLOSE_CLIENT',
    'REACTIVATE_CLIENT',
    'UNDOREJECT_CLIENT',
    'UNDOWITHDRAWAL_CLIENT',
    'READ_OFFICE',
  ],
  clientRejecter: ['READ_CLIENT', 'REJECT_CLIENT'],
  kycAdmin: [
    'READ_CLIENT',
    'READ_CLIENTIDENTIFIER',
    'CREATE_CLIENTIDENTIFIER',
    'DELETE_CLIENTIDENTIFIER',
    'READ_CLIENTNOTE',
    'CREATE_CLIENTNOTE',
    'UPDATE_CLIENTNOTE',
    'DELETE_CLIENTNOTE',
  ],
  kycReader: ['READ_CLIENT', 'READ_CLIENTIDENTIFIER', 'READ_CLIENTNOTE'],
  staffAssigner: ['READ_CLIENT', 'ASSIGNSTAFF_CLIENT', 'UNASSIGNSTAFF_CLIENT'],
} as const satisfies Record<string, readonly string[]>;

export type Persona = keyof typeof PERSONAS;

/**
 * Signs in through the real form as a persona, with the API mocked. Extra handlers answer the
 * screens a scenario visits. Always answered, unless a scenario overrides them: the home screen's
 * office lookup, the office list, and an empty client list, so a spec that only needs the clients
 * screen to render (shell, RBAC) need not mock it.
 */
export async function signInAs(page: Page, persona: Persona, extra: Record<string, Handler> = {}) {
  const api = await mockApi(page, {
    'POST /v1/authentication': () => ({
      status: 200,
      body: authResponse({ username: persona, permissions: [...PERSONAS[persona]] }),
    }),
    'GET /v1/offices/1': () => ({
      status: 200,
      body: { id: 1, name: 'Head Office', openingDate: [2009, 1, 1], hierarchy: '.' },
    }),
    'GET /v1/offices': () => ({ status: 200, body: OFFICES }),
    'GET /v1/clients': () => ({ status: 200, body: { totalFilteredRecords: 0, pageItems: [] } }),
    ...extra,
  });
  const login = new LoginPage(page);
  await login.open();
  await login.signIn('mifos', 'password');
  await page.waitForURL(/\/home$/);
  return api;
}
