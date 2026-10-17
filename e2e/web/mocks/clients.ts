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
import { OFFICES } from './organization';

const PERSON = { id: 1, code: 'legalFormType.person', value: 'Person' };
const ENTITY = { id: 2, code: 'legalFormType.entity', value: 'Entity' };
const ACTIVE = { id: 300, code: 'clientStatusType.active', value: 'Active' };
const PENDING = { id: 100, code: 'clientStatusType.pending', value: 'Pending' };

/**
 * Clients in the shapes the server sends (DOCS/test-plan/P1-05-clients.md): dates as `[y, m, d]`,
 * `legalForm` and `timeline` sent though `GET /clients/{id}` does not declare them.
 */
export const CLIENTS = [
  {
    id: 1,
    accountNo: '000000001',
    status: ACTIVE,
    active: true,
    activationDate: [2024, 3, 1],
    firstname: 'Ada',
    lastname: 'Lovelace',
    displayName: 'Ada Lovelace',
    officeId: 1,
    officeName: 'Head Office',
    externalId: 'EXT-ADA',
    mobileNo: '0772000001',
    emailAddress: 'ada@example.org',
    legalForm: PERSON,
    timeline: { submittedOnDate: [2024, 2, 20], activatedOnDate: [2024, 3, 1] },
  },
  {
    id: 2,
    accountNo: '000000002',
    status: ACTIVE,
    active: true,
    activationDate: [2025, 6, 10],
    fullname: 'Acme Traders Ltd',
    displayName: 'Acme Traders Ltd',
    officeId: 2,
    officeName: 'Kampala Branch',
    legalForm: ENTITY,
    timeline: { submittedOnDate: [2025, 6, 10], activatedOnDate: [2025, 6, 10] },
  },
  {
    id: 3,
    accountNo: '000000003',
    status: PENDING,
    active: false,
    firstname: 'Grace',
    lastname: 'Hopper',
    displayName: 'Grace Hopper',
    officeId: 1,
    officeName: 'Head Office',
    legalForm: PERSON,
    timeline: { submittedOnDate: [2026, 10, 1] },
  },
];

/** `n` active people, for paging: `Client 01` … `Client n`. */
export function manyClients(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const number = String(i + 1).padStart(2, '0');
    return {
      ...CLIENTS[0],
      id: 100 + i,
      accountNo: `0000001${number}`,
      firstname: 'Client',
      lastname: number,
      displayName: `Client ${number}`,
      externalId: undefined,
    };
  });
}

const notFound = (id: string) => ({
  status: 404,
  body: {
    developerMessage: `Client with identifier ${id} does not exist`,
    defaultUserMessage: `Client with identifier ${id} does not exist`,
    userMessageGlobalisationCode: 'error.msg.client.id.invalid',
    errors: [],
  },
});

const boom = { status: 500, body: { developerMessage: 'boom' } };
const idOf = (req: Request) => new URL(req.url()).pathname.split('/').pop() ?? '';
const isoToArray = (iso: unknown) => String(iso).split('-').map(Number);

/**
 * A small stateful clients backend. `GET /clients` honours `displayName`, `offset` and `limit`;
 * creates are added, and activation changes the status, so the pages a scenario moves to see it.
 */
export function clientsHandlers(
  options: {
    clients?: Record<string, unknown>[];
    failListOnce?: boolean;
    failOneOnce?: boolean;
  } = {},
): Record<string, Handler> {
  const clients: Record<string, unknown>[] = (options.clients ?? CLIENTS).map((c) => ({ ...c }));
  let listFailures = options.failListOnce ? 1 : 0;
  let oneFailures = options.failOneOnce ? 1 : 0;

  const handlers: Record<string, Handler> = {
    'GET /v1/offices': () => ({ status: 200, body: OFFICES }),
    'GET /v1/clients': (req) => {
      if (listFailures > 0) {
        listFailures -= 1;
        return boom;
      }
      const q = new URL(req.url()).searchParams;
      const name = (q.get('displayName') ?? '').toLowerCase();
      const matching = clients.filter((c) => String(c.displayName).toLowerCase().includes(name));
      const offset = Number(q.get('offset') ?? 0);
      const limit = Number(q.get('limit') ?? 200);
      return {
        status: 200,
        body: {
          totalFilteredRecords: matching.length,
          pageItems: matching.slice(offset, offset + limit),
        },
      };
    },
    'POST /v1/clients': (req) => {
      const body = req.postDataJSON() as Record<string, unknown>;
      const id = 10 + clients.length;
      const entity = body.legalFormId === 2;
      clients.push({
        id,
        accountNo: String(id).padStart(9, '0'),
        status: body.active ? ACTIVE : PENDING,
        active: body.active === true,
        ...(body.activationDate ? { activationDate: isoToArray(body.activationDate) } : {}),
        firstname: body.firstname,
        middlename: body.middlename,
        lastname: body.lastname,
        fullname: body.fullname,
        displayName: entity
          ? body.fullname
          : [body.firstname, body.middlename, body.lastname].filter(Boolean).join(' '),
        officeId: body.officeId,
        officeName: OFFICES.find((o) => o.id === body.officeId)?.name,
        externalId: body.externalId,
        mobileNo: body.mobileNo,
        emailAddress: body.emailAddress,
        legalForm: entity ? ENTITY : PERSON,
        timeline: { submittedOnDate: isoToArray(body.submittedOnDate) },
      });
      return { status: 200, body: { officeId: body.officeId, clientId: id, resourceId: id } };
    },
  };

  const one: Handler = (req) => {
    if (oneFailures > 0) {
      oneFailures -= 1;
      return boom;
    }
    const found = clients.find((c) => String(c.id) === idOf(req));
    return found ? { status: 200, body: found } : notFound(idOf(req));
  };
  const command: Handler = (req) => {
    const found = clients.find((c) => String(c.id) === idOf(req));
    if (!found) return notFound(idOf(req));
    if (new URL(req.url()).searchParams.get('command') !== 'activate') return boom;
    const body = req.postDataJSON() as { activationDate: string };
    Object.assign(found, {
      status: ACTIVE,
      active: true,
      activationDate: isoToArray(body.activationDate),
    });
    return { status: 200, body: { clientId: found.id, resourceId: found.id } };
  };
  for (const id of [1, 2, 3, 10, 11, 12, 13, 99, ...manyClients(25).map((c) => c.id)]) {
    handlers[`GET /v1/clients/${id}`] = one;
    handlers[`POST /v1/clients/${id}`] = command;
  }
  return handlers;
}
