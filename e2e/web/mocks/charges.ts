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
import { fieldRejection } from './organization';

const USD = {
  code: 'USD',
  name: 'US Dollar',
  decimalPlaces: 2,
  displaySymbol: '$',
  nameCode: 'currency.USD',
  displayLabel: 'US Dollar ($)',
};
const SPECIFIED_DUE_DATE = {
  id: 2,
  code: 'chargeTimeType.specifiedDueDate',
  value: 'Specified due date',
};
const FLAT = { id: 1, code: 'chargeCalculationType.flat', value: 'Flat' };

/** The charge definitions a client may be given (`chargeOptions` of the charges template). */
export const CHARGE_OPTIONS = [
  { id: 1, name: 'Membership fee', amount: 100, penalty: false },
  { id: 2, name: 'Late payment penalty', amount: 25.5, penalty: true },
].map((c) => ({
  ...c,
  active: true,
  currency: USD,
  chargeTimeType: SPECIFIED_DUE_DATE,
  chargeAppliesTo: { id: 3, code: 'chargeAppliesTo.client', value: 'Client' },
  chargeCalculationType: FLAT,
}));

/** A client charge in the server's shape, as captured from the e2e stack. */
function clientCharge(
  id: number,
  clientId: number,
  chargeId: number,
  dueDate: number[],
  amounts: { amount: number; paid?: number; waived?: number },
) {
  const option = CHARGE_OPTIONS.find((o) => o.id === chargeId)!;
  const paid = amounts.paid ?? 0;
  const waived = amounts.waived ?? 0;
  const outstanding = Math.round((amounts.amount - paid - waived) * 100) / 100;
  return {
    id,
    clientId,
    chargeId,
    name: option.name,
    chargeTimeType: SPECIFIED_DUE_DATE,
    dueDate,
    chargeCalculationType: FLAT,
    currency: USD,
    amount: amounts.amount,
    amountPaid: paid,
    amountWaived: waived,
    amountWrittenOff: 0,
    amountOutstanding: outstanding,
    penalty: option.penalty,
    isActive: true,
    isPaid: outstanding === 0 && waived === 0,
    isWaived: waived > 0 && outstanding === 0,
  };
}

/**
 * Charges per client (DOCS/test-plan/P1-11-client-charges.md): Ada (1) has a part-paid fee, an
 * outstanding penalty and a waived fee; Acme (2) and Grace (3) have none.
 */
export const CHARGES: Record<number, ReturnType<typeof clientCharge>[]> = {
  1: [
    clientCharge(3, 1, 1, [2026, 3, 10], { amount: 40, waived: 40 }),
    clientCharge(2, 1, 2, [2026, 3, 1], { amount: 25.5 }),
    clientCharge(1, 1, 1, [2026, 2, 15], { amount: 100, paid: 30 }),
  ],
  2: [],
  3: [],
};

/** The server's refusals, in the shapes captured from the e2e stack. */
const validation = (code: string, parameterName?: string) => {
  const message = `Failed data validation due to: ${code}.`;
  return {
    status: 400,
    body: {
      developerMessage:
        'The request was invalid. This typically will happen due to validation errors which are provided.',
      httpStatusCode: '400',
      defaultUserMessage: 'Validation errors exist.',
      userMessageGlobalisationCode: 'validation.msg.validation.errors.exist',
      errors: [
        {
          developerMessage: message,
          defaultUserMessage: message,
          userMessageGlobalisationCode: `validation.msg.CLIENTCHARGE.${code}`,
          ...(parameterName ? { parameterName } : {}),
        },
      ],
    },
  };
};

const ACTIVATION: Record<number, string> = { 1: '2024-03-01', 2: '2025-06-10' };
const boom = { status: 500, body: { developerMessage: 'boom' } };
const isoToArray = (iso: unknown) => String(iso).split('-').map(Number);
const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * A small stateful client-charges backend for clients 1–3: adds, payments, waivers and deletes
 * change what the next read answers.
 */
export function chargesHandlers(options: { failListOnce?: boolean } = {}): Record<string, Handler> {
  const charges = structuredClone(CHARGES);
  let listFailures = options.failListOnce ? 1 : 0;
  let nextId = 10;
  const handlers: Record<string, Handler> = {};

  for (const clientId of [1, 2, 3]) {
    const base = `/v1/clients/${clientId}/charges`;
    handlers[`GET ${base}`] = () => {
      if (listFailures > 0) {
        listFailures -= 1;
        return boom;
      }
      const items = charges[clientId]!;
      return { status: 200, body: { totalFilteredRecords: items.length, pageItems: items } };
    };
    handlers[`GET ${base}/template`] = () => ({
      status: 200,
      body: { penalty: false, chargeOptions: CHARGE_OPTIONS },
    });
    handlers[`POST ${base}`] = (req) => {
      const body = req.postDataJSON() as { chargeId: number; amount?: number; dueDate: string };
      if (body.amount === undefined) {
        return fieldRejection('amount', 'The parameter `amount` is mandatory.');
      }
      const activation = ACTIVATION[clientId];
      if (activation && body.dueDate < activation) {
        return validation('dueDate.before.activationDate', 'dueDate');
      }
      const id = nextId++;
      charges[clientId]!.unshift(
        clientCharge(id, clientId, body.chargeId, isoToArray(body.dueDate), {
          amount: body.amount,
        }),
      );
      return { status: 200, body: { officeId: 1, clientId, resourceId: id } };
    };
    for (let id = 1; id < 20; id += 1) {
      handlers[`POST ${base}/${id}`] = (req) => {
        const found = charges[clientId]!.find((c) => c.id === id);
        if (!found) return boom;
        const command = new URL(req.url()).searchParams.get('command');
        if (command === 'waive') {
          if (found.isWaived)
            return validation('transaction.invalid.account.charge.is.already.waived');
          Object.assign(found, {
            amountWaived: found.amountOutstanding,
            amountOutstanding: 0,
            isWaived: true,
          });
          return { status: 200, body: { officeId: 1, clientId, resourceId: id } };
        }
        if (command !== 'paycharge') return boom;
        const body = req.postDataJSON() as { amount: number; transactionDate?: string };
        if (!body.transactionDate) {
          return fieldRejection('transactionDate', 'The parameter `transactionDate` is mandatory.');
        }
        if (body.amount > found.amountOutstanding) {
          return validation('transaction.invalid.charge.amount.paid.in.access');
        }
        const outstanding = cents(found.amountOutstanding - body.amount);
        Object.assign(found, {
          amountPaid: cents(found.amountPaid + body.amount),
          amountOutstanding: outstanding,
          isPaid: outstanding === 0,
        });
        return { status: 200, body: { officeId: 1, clientId, resourceId: id, transactionId: '1' } };
      };
      handlers[`DELETE ${base}/${id}`] = () => {
        const found = charges[clientId]!.find((c) => c.id === id);
        if (!found) return boom;
        if (found.amountPaid > 0 || found.amountWaived > 0) {
          const message = `Client charge with id \`${id}\` cannot be deleted as transactions have been made on the same`;
          return {
            status: 403,
            body: {
              developerMessage:
                'The request caused a data integrity issue to be fired by the database.',
              httpStatusCode: '403',
              defaultUserMessage: message,
              userMessageGlobalisationCode: 'error.msg.client.charge.cannot.be.deleted',
              errors: [
                {
                  developerMessage:
                    'The request caused a data integrity issue to be fired by the database.',
                  defaultUserMessage: message,
                  userMessageGlobalisationCode: 'error.msg.client.charge.cannot.be.deleted',
                  parameterName: 'clientChargeId',
                },
              ],
            },
          };
        }
        charges[clientId] = charges[clientId]!.filter((c) => c.id !== id);
        return { status: 200, body: { officeId: 1, clientId, resourceId: id } };
      };
    }
  }
  return handlers;
}
