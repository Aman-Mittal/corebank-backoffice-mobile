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

import type { Handler } from './api';

const code = (id: number, name: string) => ({
  id,
  name,
  position: 1,
  description: '',
  active: true,
  mandatory: false,
});

/** The family member template, as the e2e stack answers it once its codes are seeded. */
export const FAMILY_TEMPLATE = {
  relationshipIdOptions: [code(26, 'Spouse'), code(27, 'Son')],
  genderIdOptions: [code(28, 'Female')],
  maritalStatusIdOptions: [code(29, 'Married')],
  professionIdOptions: [code(30, 'Teacher')],
};

const LABELS: Record<number, string> = {
  26: 'Spouse',
  27: 'Son',
  28: 'Female',
  29: 'Married',
  30: 'Teacher',
};

/** A member in the server's shape: `0` and no label for a choice not made. */
function member(id: number, clientId: number, body: Record<string, unknown>) {
  const pick = (key: string, label: string) => {
    const value = (body[key] as number | undefined) ?? 0;
    return value === 0 ? { [key]: 0 } : { [key]: value, [label]: LABELS[value] };
  };
  return {
    id,
    clientId,
    firstName: body.firstName ?? '',
    middleName: body.middleName ?? '',
    lastName: body.lastName ?? '',
    qualification: body.qualification ?? '',
    ...pick('relationshipId', 'relationship'),
    ...pick('maritalStatusId', 'maritalStatus'),
    ...pick('genderId', 'gender'),
    ...(body.dateOfBirth ? { dateOfBirth: body.dateOfBirth } : {}),
    ...pick('professionId', 'profession'),
    mobileNumber: body.mobileNumber ?? '',
    age: body.age ?? 0,
    isDependent: body.isDependent === true,
  };
}

/** Members per client (DOCS/test-plan/P1-13-family-members.md): Ada (1) has two, Acme (2) none. */
export const FAMILY: Record<number, ReturnType<typeof member>[]> = {
  1: [
    member(7, 1, {
      firstName: 'Mary',
      middleName: 'Ann',
      lastName: 'Lovelace',
      qualification: 'MSc',
      relationshipId: 26,
      genderId: 28,
      maritalStatusId: 29,
      professionId: 30,
      mobileNumber: '5550101',
      age: 34,
      dateOfBirth: '1992-04-03',
    }),
    member(8, 1, { firstName: 'Tom', lastName: 'Lovelace', relationshipId: 27, isDependent: true }),
  ],
  2: [],
};

const lastId = (url: string) => Number(new URL(url).pathname.split('/').pop());

/** A small stateful family members backend for clients 1 and 2. */
export function familyHandlers(
  options: { noRelationships?: boolean } = {},
): Record<string, Handler> {
  const family = structuredClone(FAMILY);
  let nextId = 20;
  const handlers: Record<string, Handler> = {};
  for (const clientId of [1, 2]) {
    const base = `/v1/clients/${clientId}/familymembers`;
    handlers[`GET ${base}`] = () => ({ status: 200, body: family[clientId]! });
    handlers[`GET ${base}/template`] = () => ({
      status: 200,
      body: options.noRelationships
        ? { ...FAMILY_TEMPLATE, relationshipIdOptions: [] }
        : FAMILY_TEMPLATE,
    });
    handlers[`POST ${base}`] = (req) => {
      const id = nextId++;
      family[clientId]!.push(member(id, clientId, req.postDataJSON() as Record<string, unknown>));
      return { status: 200, body: { resourceId: id } };
    };
    for (let id = 1; id < 30; id += 1) {
      handlers[`PUT ${base}/${id}`] = (req) => {
        const body = req.postDataJSON() as Record<string, unknown>;
        // As the server does: without all three optional choices, a NullPointerException.
        if (!['genderId', 'maritalStatusId', 'professionId'].every((k) => k in body)) {
          return { status: 500, body: { status: 500, error: 'Internal Server Error' } };
        }
        const memberId = lastId(req.url());
        family[clientId] = family[clientId]!.map((m) =>
          m.id === memberId ? member(memberId, clientId, body) : m,
        );
        return { status: 200, body: { resourceId: memberId } };
      };
      handlers[`DELETE ${base}/${id}`] = (req) => {
        family[clientId] = family[clientId]!.filter((m) => m.id !== lastId(req.url()));
        return { status: 200, body: { resourceId: id } };
      };
    }
  }
  return handlers;
}
