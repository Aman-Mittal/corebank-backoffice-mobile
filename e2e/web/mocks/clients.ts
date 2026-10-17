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
import { fieldRejection, OFFICES } from './organization';

const PERSON = { id: 1, code: 'legalFormType.person', value: 'Person' };
const ENTITY = { id: 2, code: 'legalFormType.entity', value: 'Entity' };
const ACTIVE = { id: 300, code: 'clientStatusType.active', value: 'Active' };
const PENDING = { id: 100, code: 'clientStatusType.pending', value: 'Pending' };
const STATUSES = {
  pending: PENDING,
  active: ACTIVE,
  transferInProgress: {
    id: 303,
    code: 'clientStatusType.transfer.in.progress',
    value: 'Transfer in progress',
  },
  withdrawn: { id: 400, code: 'clientStatusType.withdraw', value: 'Withdrawn' },
  rejected: { id: 500, code: 'clientStatusType.rejected', value: 'Rejected' },
  closed: { id: 600, code: 'clientStatusType.closed', value: 'Closed' },
} as const;
type MockStatus = keyof typeof STATUSES;

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
    staffId: 1,
    staffName: 'Director, Program',
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

const person = (id: number, firstname: string, lastname: string, status: MockStatus) => ({
  id,
  accountNo: String(id).padStart(9, '0'),
  status: STATUSES[status],
  active: status === 'active',
  firstname,
  lastname,
  displayName: `${firstname} ${lastname}`,
  officeId: 1,
  officeName: 'Head Office',
  legalForm: PERSON,
});

/**
 * One client in each status the lifecycle scenarios start from (DOCS/test-plan/
 * P1-06-client-lifecycle.md). Passed with `CLIENTS`, so the P1-05 specs keep their three.
 */
export const LIFECYCLE_CLIENTS = [
  { ...person(4, 'Mary', 'Shelley', 'rejected'), timeline: { submittedOnDate: [2026, 9, 1] } },
  {
    ...person(5, 'Alan', 'Turing', 'closed'),
    activationDate: [2025, 1, 2],
    timeline: {
      submittedOnDate: [2025, 1, 2],
      activatedOnDate: [2025, 1, 2],
      closedOnDate: [2026, 9, 30],
    },
  },
  { ...person(6, 'Emmy', 'Noether', 'withdrawn'), timeline: { submittedOnDate: [2026, 9, 2] } },
  {
    ...person(7, 'Kurt', 'Godel', 'transferInProgress'),
    activationDate: [2025, 5, 5],
    timeline: { submittedOnDate: [2025, 5, 5], activatedOnDate: [2025, 5, 5] },
  },
];

/** The reasons each command's template offers, as `CodeValueData`. */
export const REASONS = {
  reject: [
    { id: 31, name: 'Incomplete documents', position: 1, active: true, mandatory: false },
    { id: 32, name: 'Duplicate application', position: 2, active: true, mandatory: false },
  ],
  withdraw: [
    { id: 41, name: 'Client changed their mind', position: 1, active: true, mandatory: false },
    { id: 42, name: 'Moved away', position: 2, active: true, mandatory: false },
  ],
  close: [
    { id: 51, name: 'Relocated', position: 1, active: true, mandatory: false },
    { id: 52, name: 'Deceased', position: 2, active: true, mandatory: false },
  ],
};

/** The members of staff `GET /clients/template?officeId=…` offers (`StaffData`). */
export const STAFF_OPTIONS = [
  { id: 1, displayName: 'Director, Program', officeId: 1, isLoanOfficer: true, isActive: true },
  { id: 4, displayName: 'Officer, Probe', officeId: 1, isLoanOfficer: true, isActive: true },
];

/**
 * The server's state machine: the status a command needs, the status it leaves, and the date
 * field it reads. Anything else is refused as the server refuses it.
 */
const TRANSITIONS: Record<string, { from: MockStatus; to: MockStatus; date: string }> = {
  activate: { from: 'pending', to: 'active', date: 'activationDate' },
  reject: { from: 'pending', to: 'rejected', date: 'rejectionDate' },
  withdraw: { from: 'pending', to: 'withdrawn', date: 'withdrawalDate' },
  close: { from: 'active', to: 'closed', date: 'closureDate' },
  reactivate: { from: 'closed', to: 'pending', date: 'reactivationDate' },
  undoRejection: { from: 'rejected', to: 'pending', date: 'reopenedDate' },
  undoWithdrawal: { from: 'withdrawn', to: 'pending', date: 'reopenedDate' },
};

/** A domain-rule refusal, in the server's shape (`InvalidClientStateTransitionException`). */
export function domainRefusal(code: string, message: string) {
  return {
    status: 403,
    body: {
      developerMessage: message,
      httpStatusCode: '403',
      defaultUserMessage: message,
      userMessageGlobalisationCode: 'validation.msg.domain.rule.violation',
      errors: [
        {
          developerMessage: message,
          defaultUserMessage: message,
          userMessageGlobalisationCode: code,
          parameterName: 'id',
        },
      ],
    },
  };
}

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
    /** Every command template answers no reasons, as the community sandbox does. */
    noReasons?: boolean;
    /** The office template offers no staff. */
    noStaff?: boolean;
    /** The next command answers this instead of running. */
    refuseCommand?: NonNullable<ReturnType<Handler>>;
    /** The server's status for a client, applied before its next command: another user acted. */
    changedElsewhere?: Record<number, MockStatus>;
  } = {},
): Record<string, Handler> {
  const clients: Record<string, unknown>[] = (options.clients ?? CLIENTS).map((c) => ({ ...c }));
  let listFailures = options.failListOnce ? 1 : 0;
  let oneFailures = options.failOneOnce ? 1 : 0;
  let refusal = options.refuseCommand;
  const elsewhere = new Map(Object.entries(options.changedElsewhere ?? {}));

  const handlers: Record<string, Handler> = {
    'GET /v1/offices': () => ({ status: 200, body: OFFICES }),
    'GET /v1/clients/template': (req) => {
      const q = new URL(req.url()).searchParams;
      if (q.has('officeId')) {
        return { status: 200, body: { staffOptions: options.noStaff ? [] : STAFF_OPTIONS } };
      }
      const command = q.get('commandParam') as keyof typeof REASONS;
      const narrations = options.noReasons ? [] : (REASONS[command] ?? []);
      return { status: 200, body: { isStaff: false, narrations } };
    },
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
    if (refusal) {
      const answer = refusal;
      refusal = undefined;
      return answer;
    }
    const later = elsewhere.get(String(found.id));
    if (later) {
      Object.assign(found, { status: STATUSES[later], active: later === 'active' });
      elsewhere.delete(String(found.id));
    }
    const name = new URL(req.url()).searchParams.get('command') ?? '';
    if (name === 'assignStaff' || name === 'unassignStaff') return staffCommand(found, name, req);
    const transition = TRANSITIONS[name];
    if (!transition) return boom;
    if ((found.status as { code: string }).code !== STATUSES[transition.from].code) {
      return domainRefusal(
        `error.msg.client.${name}.on.account.not.in.${transition.from}.status`,
        `Only ${transition.from} clients may be ${name === 'close' ? 'closed' : `given ${name}`}.`,
      );
    }
    const body = req.postDataJSON() as Record<string, unknown>;
    const date = isoToArray(body[transition.date]);
    const timeline = { ...(found.timeline as object) };
    if (transition.to === 'closed') Object.assign(timeline, { closedOnDate: date });
    if (transition.to === 'pending') Object.assign(timeline, { closedOnDate: undefined });
    Object.assign(found, {
      status: STATUSES[transition.to],
      active: transition.to === 'active',
      ...(transition.to === 'active' ? { activationDate: date } : {}),
      timeline,
    });
    return { status: 200, body: { clientId: found.id, resourceId: found.id } };
  };
  const staffCommand = (found: Record<string, unknown>, name: string, req: Request) => {
    const { staffId } = (req.postDataJSON() ?? {}) as { staffId?: number };
    if (staffId === undefined) {
      return fieldRejection('staffId', 'The parameter `staffId` is mandatory.');
    }
    const member = STAFF_OPTIONS.find((m) => m.id === staffId);
    Object.assign(
      found,
      name === 'assignStaff'
        ? { staffId, staffName: member?.displayName }
        : { staffId: undefined, staffName: undefined },
    );
    return {
      status: 200,
      body: { clientId: found.id, resourceId: found.id, changes: { staffId } },
    };
  };
  for (const id of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 99, ...manyClients(25).map((c) => c.id)]) {
    handlers[`GET /v1/clients/${id}`] = one;
    handlers[`POST /v1/clients/${id}`] = command;
  }
  return handlers;
}
