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

import type { APIRequestContext } from '@playwright/test';

import { fineractGet, fineractPost, runId } from '../fineract-api';

/**
 * Creates an entity client (legal form 2) in the head office through the REST API, pending, so
 * no dates are needed: the server defaults the submitted-on date. Written for this project.
 */
export async function createEntityClient(request: APIRequestContext) {
  const fullname = `E2E Entity ${runId()} Ltd`;
  const res = await fineractPost(request, '/v1/clients', {
    officeId: 1,
    legalFormId: 2,
    fullname,
    active: false,
    locale: 'en',
    dateFormat: 'yyyy-MM-dd',
  });
  if (!res.ok()) throw new Error(`POST /clients answered ${res.status()}: ${await res.text()}`);
  return { fullname, clientId: (await res.json()).clientId as number };
}

async function ok(res: Awaited<ReturnType<typeof fineractPost>>, what: string) {
  if (!res.ok()) throw new Error(`${what} answered ${res.status()}: ${await res.text()}`);
  return res.json();
}

/**
 * Creates a person in the head office through the REST API: pending, or active on the day it was
 * submitted. Answers the name the list searches by. Written for this project.
 */
export async function createPersonClient(
  request: APIRequestContext,
  { active }: { active: boolean },
) {
  const lastname = `E2E${runId()}`;
  const date = '2026-01-05';
  const body = await ok(
    await fineractPost(request, '/v1/clients', {
      officeId: 1,
      legalFormId: 1,
      firstname: 'Life',
      lastname,
      submittedOnDate: date,
      active,
      ...(active ? { activationDate: date } : {}),
      locale: 'en',
      dateFormat: 'yyyy-MM-dd',
    }),
    'POST /clients',
  );
  return { displayName: `Life ${lastname}`, clientId: body.clientId as number };
}

/**
 * Makes sure the code `codeName` (`ClientRejectReason`, `ClientClosureReason`, …) has a value
 * named `name`, and answers its id. The stack ships these codes empty, and the server requires a
 * reason for reject, withdraw and close.
 */
export async function ensureCodeValue(request: APIRequestContext, codeName: string, name: string) {
  const codes = (await (await fineractGet(request, '/v1/codes')).json()) as {
    id: number;
    name: string;
  }[];
  const code = codes.find((c) => c.name === codeName);
  if (!code) throw new Error(`no code named ${codeName}`);
  const values = (await (await fineractGet(request, `/v1/codes/${code.id}/codevalues`)).json()) as {
    id: number;
    name: string;
  }[];
  const existing = values.find((v) => v.name === name);
  if (existing) return existing.id;
  const body = await ok(
    await fineractPost(request, `/v1/codes/${code.id}/codevalues`, {
      name,
      position: values.length + 1,
      isActive: true,
    }),
    `POST /codes/${code.id}/codevalues`,
  );
  return body.subResourceId as number;
}

/**
 * Runs a client command (`activate`, `reject`, `assignStaff`, …) through the REST API. A command
 * with a date gets the locale and date format; the server refuses them on one without
 * (`assignStaff` answers 400 for unsupported parameters).
 */
export async function clientCommand(
  request: APIRequestContext,
  clientId: number,
  command: string,
  body: Record<string, unknown>,
) {
  const dated = Object.keys(body).some((k) => k.endsWith('Date'));
  return ok(
    await fineractPost(request, `/v1/clients/${clientId}?command=${command}`, {
      ...(dated ? { locale: 'en', dateFormat: 'yyyy-MM-dd' } : {}),
      ...body,
    }),
    `POST /clients/${clientId}?command=${command}`,
  );
}

/** Adds a Passport identifier with `key` to the client through the REST API; answers its id. */
export async function addPassport(request: APIRequestContext, clientId: number, key: string) {
  const template = (await (
    await fineractGet(request, `/v1/clients/${clientId}/identifiers/template`)
  ).json()) as { allowedDocumentTypes: { id: number; name: string }[] };
  const passport = template.allowedDocumentTypes.find((t) => t.name === 'Passport');
  if (!passport) throw new Error('the stack has no Passport document type');
  const body = await ok(
    await fineractPost(request, `/v1/clients/${clientId}/identifiers`, {
      documentTypeId: passport.id,
      documentKey: key,
      status: 'Active',
    }),
    `POST /clients/${clientId}/identifiers`,
  );
  return body.resourceId as number;
}
