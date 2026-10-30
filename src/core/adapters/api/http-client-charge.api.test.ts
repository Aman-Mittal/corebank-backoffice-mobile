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

import paidRefusal from '@/testing/fixtures/backend/client.charge.delete-paid.json';
import partlyPaid from '@/testing/fixtures/backend/stack.client.charge.partly-paid.json';
import stackCharges from '@/testing/fixtures/backend/stack.client.charges.json';
import template from '@/testing/fixtures/backend/stack.client.charges.template.json';
import { AppError } from '@/core/http/app-error';
import { fakeApi } from '@/testing/fake-api';

import { HttpClientChargeApi, mapChargeOption, mapClientCharge } from './http-client-charge.api';

const USD = { code: 'USD', decimalPlaces: 2 };

describe('payloads captured from the e2e stack', () => {
  it('maps the list: a waived, an outstanding penalty and a paid charge, latest due first', () => {
    expect(stackCharges.pageItems.map(mapClientCharge)).toEqual([
      {
        id: 2,
        chargeId: 1,
        name: 'E2E Client Fee',
        penalty: false,
        dueDate: '2026-03-10',
        currency: USD,
        amount: 40,
        amountPaid: 0,
        amountWaived: 40,
        amountOutstanding: 0,
        status: 'waived',
      },
      {
        id: 3,
        chargeId: 2,
        name: 'E2E Client Penalty',
        penalty: true,
        dueDate: '2026-03-01',
        currency: USD,
        amount: 25.5,
        amountPaid: 0,
        amountWaived: 0,
        amountOutstanding: 25.5,
        status: 'outstanding',
      },
      {
        id: 1,
        chargeId: 1,
        name: 'E2E Client Fee',
        penalty: false,
        dueDate: '2026-02-15',
        currency: USD,
        amount: 100,
        amountPaid: 100,
        amountWaived: 0,
        amountOutstanding: 0,
        status: 'paid',
      },
    ]);
  });

  it('keeps a part-paid charge outstanding', () => {
    expect(mapClientCharge(partlyPaid)).toMatchObject({
      amountPaid: 30,
      amountOutstanding: 70,
      status: 'outstanding',
    });
  });

  it("maps the template's charge options with their amount and currency", () => {
    expect(template.chargeOptions.map(mapChargeOption)).toEqual([
      { id: 1, name: 'E2E Client Fee', amount: 100, penalty: false, currency: USD },
      { id: 2, name: 'E2E Client Penalty', amount: 25.5, penalty: true, currency: USD },
    ]);
  });
});

describe('mapClientCharge', () => {
  it('fails loudly without an id, and reads missing amounts as zero', () => {
    expect(() => mapClientCharge({ name: 'x' })).toThrow(/no id/);
    expect(mapClientCharge({ id: 4 })).toEqual({
      id: 4,
      chargeId: null,
      name: '',
      penalty: false,
      dueDate: null,
      currency: { code: '', decimalPlaces: 2 },
      amount: 0,
      amountPaid: 0,
      amountWaived: 0,
      amountOutstanding: 0,
      status: 'outstanding',
    });
  });
});

describe('HttpClientChargeApi', () => {
  it('lists the page items, and fails on an answer that is not a page', async () => {
    const api = fakeApi({ 'GET /v1/clients/14/charges': [200, stackCharges] });
    const ids = (await new HttpClientChargeApi(api.client).charges(14)).map((c) => c.id);
    expect(ids).toEqual([2, 3, 1]);
    const odd = fakeApi({ 'GET /v1/clients/14/charges': [200, { unexpected: true }] });
    await expect(new HttpClientChargeApi(odd.client).charges(14)).rejects.toThrow(/pageItems/);
  });

  it('offers only active charge options', async () => {
    const api = fakeApi({
      'GET /v1/clients/14/charges/template': [
        200,
        {
          chargeOptions: [
            { id: 1, name: 'On', active: true },
            { id: 2, name: 'Off', active: false },
          ],
        },
      ],
    });
    const options = await new HttpClientChargeApi(api.client).chargeOptions(14);
    expect(options.map((o) => o.name)).toEqual(['On']);
  });

  it('adds a charge with its amount and ISO due date', async () => {
    const api = fakeApi({
      'POST /v1/clients/14/charges': [200, { officeId: 1, clientId: 14, resourceId: 9 }],
    });
    const id = await new HttpClientChargeApi(api.client).addCharge(14, {
      chargeId: 1,
      amount: 80,
      dueDate: '2026-11-15',
    });
    expect(id).toBe(9);
    expect(api.requests[0]!.body).toEqual({
      chargeId: 1,
      amount: 80,
      dueDate: '2026-11-15',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
  });

  it('pays with paycharge, waives with an empty body, and deletes by path', async () => {
    const api = fakeApi({
      'POST /v1/clients/14/charges/3': [200, { clientId: 14, resourceId: 3 }],
      'DELETE /v1/clients/14/charges/3': [200, { resourceId: 3 }],
    });
    const http = new HttpClientChargeApi(api.client);
    await http.payCharge(14, 3, { amount: 10, transactionDate: '2026-02-20' });
    await http.waiveCharge(14, 3);
    await http.deleteCharge(14, 3);
    const [pay, waive, remove] = api.requests;
    expect(pay!.query.get('command')).toBe('paycharge');
    expect(pay!.body).toEqual({
      amount: 10,
      transactionDate: '2026-02-20',
      dateFormat: 'yyyy-MM-dd',
      locale: 'en',
    });
    expect(waive!.query.get('command')).toBe('waive');
    expect(waive!.body).toEqual({});
    expect(remove!.method).toBe('DELETE');
  });

  it("surfaces the server's refusal to change a paid charge", async () => {
    const api = fakeApi({ 'DELETE /v1/clients/14/charges/1': [400, paidRefusal] });
    const failure = await new HttpClientChargeApi(api.client).deleteCharge(14, 1).catch((e) => e);
    expect(failure).toBeInstanceOf(AppError);
    expect((failure as AppError).messages[0]!.message).toContain('charge.is.paid');
  });
});
