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

import { call, type ApiClient } from '@/core/http/client';

import { ISO_DATE_FIELDS, toIsoApiDate } from './api-date';
import type {
  ChargeDraft,
  ChargeOption,
  ChargePayment,
  ClientCharge,
  ClientChargeApi,
  Currency,
} from './client-charge.api';
import { required } from './required';

interface CurrencyPayload {
  readonly code?: string;
  readonly decimalPlaces?: number;
}

/** A client charge, as the server sends it: `dueDate` is `[y, m, d]`. */
export interface ClientChargePayload {
  readonly id?: number;
  readonly chargeId?: number;
  readonly name?: string;
  readonly penalty?: boolean;
  readonly dueDate?: string | readonly number[];
  readonly currency?: CurrencyPayload;
  readonly amount?: number;
  readonly amountPaid?: number;
  readonly amountWaived?: number;
  readonly amountOutstanding?: number;
  readonly isPaid?: boolean;
  readonly isWaived?: boolean;
}

/** A charge definition (`ChargeData`), as the template sends it. */
export interface ChargeOptionPayload {
  readonly id?: number;
  readonly name?: string;
  readonly amount?: number;
  readonly penalty?: boolean;
  readonly active?: boolean;
  readonly currency?: CurrencyPayload;
}

const mapCurrency = (payload: CurrencyPayload | undefined): Currency => ({
  code: payload?.code ?? '',
  decimalPlaces: payload?.decimalPlaces ?? 2,
});

/** Exported for its own test: this is where upstream drift surfaces. */
export function mapClientCharge(payload: ClientChargePayload): ClientCharge {
  return {
    id: required(payload.id, 'client charge', 'id'),
    chargeId: payload.chargeId ?? null,
    name: payload.name ?? '',
    penalty: payload.penalty === true,
    dueDate: toIsoApiDate(payload.dueDate),
    currency: mapCurrency(payload.currency),
    amount: payload.amount ?? 0,
    amountPaid: payload.amountPaid ?? 0,
    amountWaived: payload.amountWaived ?? 0,
    amountOutstanding: payload.amountOutstanding ?? 0,
    status: payload.isWaived ? 'waived' : payload.isPaid ? 'paid' : 'outstanding',
  };
}

export function mapChargeOption(payload: ChargeOptionPayload): ChargeOption {
  return {
    id: required(payload.id, 'charge option', 'id'),
    name: payload.name ?? '',
    amount: payload.amount ?? 0,
    penalty: payload.penalty === true,
    currency: mapCurrency(payload.currency),
  };
}

export class HttpClientChargeApi implements ClientChargeApi {
  constructor(private readonly client: ApiClient) {}

  async charges(clientId: number): Promise<readonly ClientCharge[]> {
    const page = await call(
      this.client.GET('/v1/clients/{clientId}/charges', { params: { path: { clientId } } }),
    );
    // Without a limit the server answers every charge; a page is still a page, though.
    const items = (page as { pageItems?: ClientChargePayload[] } | undefined)?.pageItems;
    if (!Array.isArray(items)) throw new TypeError('client charges: the answer has no pageItems');
    return items.map(mapClientCharge);
  }

  async chargeOptions(clientId: number): Promise<readonly ChargeOption[]> {
    const template = await call(
      this.client.GET('/v1/clients/{clientId}/charges/template', {
        params: { path: { clientId } },
      }),
    );
    const options = ((template as { chargeOptions?: ChargeOptionPayload[] } | undefined)
      ?.chargeOptions ?? []) as ChargeOptionPayload[];
    return options.filter((o) => o.active !== false).map(mapChargeOption);
  }

  async addCharge(clientId: number, draft: ChargeDraft): Promise<number> {
    const response = await call(
      this.client.POST('/v1/clients/{clientId}/charges', {
        params: { path: { clientId } },
        // The amount is always sent: the server requires it, though the API document does not.
        body: {
          chargeId: draft.chargeId,
          amount: draft.amount,
          dueDate: draft.dueDate,
          ...ISO_DATE_FIELDS,
        },
      }),
    );
    return required(response?.resourceId, 'client charge create response', 'id');
  }

  async payCharge(clientId: number, chargeId: number, payment: ChargePayment): Promise<void> {
    await call(
      this.client.POST('/v1/clients/{clientId}/charges/{chargeId}', {
        params: { path: { clientId, chargeId }, query: { command: 'paycharge' } },
        body: {
          amount: payment.amount,
          transactionDate: payment.transactionDate,
          ...ISO_DATE_FIELDS,
        },
      }),
    );
  }

  async waiveCharge(clientId: number, chargeId: number): Promise<void> {
    await call(
      this.client.POST('/v1/clients/{clientId}/charges/{chargeId}', {
        params: { path: { clientId, chargeId }, query: { command: 'waive' } },
        body: {},
      }),
    );
  }

  async deleteCharge(clientId: number, chargeId: number): Promise<void> {
    await call(
      this.client.DELETE('/v1/clients/{clientId}/charges/{chargeId}', {
        params: { path: { clientId, chargeId } },
      }),
    );
  }
}
