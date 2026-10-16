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

import type { Request } from '@playwright/test';

import type { Handler } from './api';

/**
 * Offices and staff in the shapes the server sends (DOCS/test-plan/P1-04-offices-staff.md):
 * office dates as `[y, m, d]`, staff `joiningDate` as a string, `parentId` undeclared but sent.
 */
export const OFFICES = [
  {
    id: 1,
    name: 'Head Office',
    nameDecorated: 'Head Office',
    externalId: '1',
    openingDate: [2009, 1, 1],
    hierarchy: '.',
  },
  {
    id: 2,
    name: 'Kampala Branch',
    nameDecorated: '....Kampala Branch',
    externalId: 'KB-01',
    openingDate: [2026, 10, 2],
    hierarchy: '.2.',
    parentId: 1,
    parentName: 'Head Office',
  },
  {
    id: 3,
    name: 'Entebbe Sub-branch',
    nameDecorated: '........Entebbe Sub-branch',
    openingDate: [2026, 10, 3],
    hierarchy: '.2.3.',
    parentId: 2,
    parentName: 'Kampala Branch',
  },
];

export const STAFF = [
  {
    id: 1,
    firstname: 'Program',
    lastname: 'Director',
    displayName: 'Director, Program',
    officeId: 1,
    officeName: 'Head Office',
    isLoanOfficer: true,
    isActive: true,
    mobileNo: '0700000001',
    joiningDate: '2020-01-01',
  },
  {
    id: 2,
    firstname: 'Grace',
    lastname: 'Okello',
    displayName: 'Okello, Grace',
    officeId: 2,
    officeName: 'Kampala Branch',
    isLoanOfficer: false,
    isActive: false,
    joiningDate: '2026-10-05',
  },
];

const notFound = (what: string, id: string) => ({
  status: 404,
  body: {
    developerMessage: `${what} with identifier ${id} does not exist`,
    defaultUserMessage: `${what} with identifier ${id} does not exist`,
    userMessageGlobalisationCode: `error.msg.${what.toLowerCase()}.id.invalid`,
    errors: [],
  },
});

const idOf = (req: Request) => new URL(req.url()).pathname.split('/').pop() ?? '';

/**
 * A small stateful backend for the organization screens. Creates are added to the lists, so the
 * screen a create navigates to, and the list after it, see the new record.
 */
export function organizationHandlers(
  options: { staff?: typeof STAFF; failOfficesOnce?: boolean } = {},
): Record<string, Handler> {
  const offices: Record<string, unknown>[] = OFFICES.map((o) => ({ ...o }));
  const staff: Record<string, unknown>[] = (options.staff ?? STAFF).map((s) => ({ ...s }));
  let officeFailures = options.failOfficesOnce ? 1 : 0;

  const office = (req: Request) => {
    const found = offices.find((o) => String(o.id) === idOf(req));
    return found ? { status: 200, body: found } : notFound('Office', idOf(req));
  };
  const member = (req: Request) => {
    const found = staff.find((s) => String(s.id) === idOf(req));
    return found ? { status: 200, body: found } : notFound('Staff', idOf(req));
  };

  const handlers: Record<string, Handler> = {
    'GET /v1/offices': () => {
      if (officeFailures > 0) {
        officeFailures -= 1;
        return { status: 500, body: { developerMessage: 'boom' } };
      }
      return { status: 200, body: offices };
    },
    'POST /v1/offices': (req) => {
      const body = req.postDataJSON() as { name: string; parentId: number };
      const parent = offices.find((o) => o.id === body.parentId);
      const id = offices.length + 1;
      offices.push({
        id,
        name: body.name,
        nameDecorated: body.name,
        hierarchy: `${String(parent?.hierarchy ?? '.')}${id}.`,
        parentId: body.parentId,
        parentName: parent?.name,
        openingDate: [2026, 1, 5],
      });
      return { status: 200, body: { officeId: id, resourceId: id } };
    },
    'GET /v1/staff': (req) => {
      const officeId = new URL(req.url()).searchParams.get('officeId');
      return {
        status: 200,
        body: officeId ? staff.filter((s) => String(s.officeId) === officeId) : staff,
      };
    },
    'POST /v1/staff': (req) => {
      const body = req.postDataJSON() as Record<string, unknown>;
      const id = staff.length + 1;
      staff.push({
        ...body,
        id,
        displayName: `${String(body.lastname)}, ${String(body.firstname)}`,
        officeName: offices.find((o) => o.id === body.officeId)?.name,
      });
      return { status: 200, body: { officeId: body.officeId, resourceId: id } };
    },
  };

  for (const o of [...OFFICES, { id: 4 }, { id: 99 }]) {
    handlers[`GET /v1/offices/${o.id}`] = office;
    handlers[`PUT /v1/offices/${o.id}`] = (req) => {
      const found = offices.find((x) => String(x.id) === idOf(req));
      if (!found) return notFound('Office', idOf(req));
      Object.assign(found, req.postDataJSON() as object);
      found.nameDecorated = found.name;
      return { status: 200, body: { officeId: found.id, resourceId: found.id } };
    };
  }
  for (const s of [...STAFF, { id: 3 }, { id: 99 }]) {
    handlers[`GET /v1/staff/${s.id}`] = member;
    handlers[`PUT /v1/staff/${s.id}`] = (req) => {
      const found = staff.find((x) => String(x.id) === idOf(req));
      if (!found) return notFound('Staff', idOf(req));
      Object.assign(found, req.postDataJSON() as object);
      found.displayName = `${String(found.lastname)}, ${String(found.firstname)}`;
      return { status: 200, body: { resourceId: found.id } };
    };
  }
  return handlers;
}

/** A 400 naming one parameter, in the server's validation-error shape. */
export const fieldRejection = (parameterName: string, message: string) => ({
  status: 400,
  body: {
    developerMessage:
      'The request was invalid. This typically will happen due to validation errors which are provided.',
    httpStatusCode: '400',
    defaultUserMessage: 'Validation errors exist.',
    userMessageGlobalisationCode: 'validation.msg.validation.errors.exist',
    errors: [{ parameterName, developerMessage: message, defaultUserMessage: message }],
  },
});
