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

import { token } from '../registry';

/** Read from the flags (`isPaid`, `isWaived`), never from a label. */
export type ChargeStatus = 'outstanding' | 'paid' | 'waived';

/** A currency as an amount needs it: its code and how many decimal places it shows. */
export interface Currency {
  readonly code: string;
  readonly decimalPlaces: number;
}

/** A fee or penalty charged to a client directly. */
export interface ClientCharge {
  readonly id: number;
  readonly chargeId: number | null;
  readonly name: string;
  readonly penalty: boolean;
  /** ISO date; `null` when absent. */
  readonly dueDate: string | null;
  readonly currency: Currency;
  readonly amount: number;
  readonly amountPaid: number;
  readonly amountWaived: number;
  readonly amountOutstanding: number;
  readonly status: ChargeStatus;
}

/** A charge definition a client may be given (the template's `chargeOptions`). */
export interface ChargeOption {
  readonly id: number;
  readonly name: string;
  readonly amount: number;
  readonly penalty: boolean;
  readonly currency: Currency;
}

/** What adding a charge collects. The adapter adds the date format and locale. */
export interface ChargeDraft {
  readonly chargeId: number;
  readonly amount: number;
  /** ISO date. */
  readonly dueDate: string;
}

export interface ChargePayment {
  readonly amount: number;
  /** ISO date. */
  readonly transactionDate: string;
}

/** A client's charges (DOCS/test-plan/P1-11-client-charges.md). */
export interface ClientChargeApi {
  /** Every charge, in the server's order (latest due date first). */
  charges(clientId: number): Promise<readonly ClientCharge[]>;
  /** The active charge definitions that may apply to this client. */
  chargeOptions(clientId: number): Promise<readonly ChargeOption[]>;
  /** Adds a charge and answers its id. */
  addCharge(clientId: number, draft: ChargeDraft): Promise<number>;
  payCharge(clientId: number, chargeId: number, payment: ChargePayment): Promise<void>;
  waiveCharge(clientId: number, chargeId: number): Promise<void>;
  deleteCharge(clientId: number, chargeId: number): Promise<void>;
}

export const CLIENT_CHARGE_API = token<ClientChargeApi>('ClientChargeApi');
