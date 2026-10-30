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

import type { ClientCommand, ClientStatus, ReasonedCommand } from '@/core/adapters/api/client.api';

/**
 * The commands each status allows, in the order they are offered. Transfers are not here: they
 * have their own panel (ClientTransfer). A status this app does not know offers nothing rather
 * than a guess.
 */
const ACTIONS: Record<ClientStatus, readonly ClientCommand[]> = {
  pending: ['activate', 'reject', 'withdraw'],
  active: ['close'],
  closed: ['reactivate'],
  rejected: ['undoRejection'],
  withdrawn: ['undoWithdrawal'],
  transferInProgress: [],
  transferOnHold: [],
  unknown: [],
};

export function clientActions(status: ClientStatus): readonly ClientCommand[] {
  return ACTIONS[status];
}

/** The code an administrator fills with each reasoned command's reasons. */
export const REASON_CODES: Record<ReasonedCommand, string> = {
  reject: 'ClientRejectReason',
  withdraw: 'ClientWithdrawReason',
  close: 'ClientClosureReason',
};

export function isReasoned(command: ClientCommand): command is ReasonedCommand {
  return command in REASON_CODES;
}

/** Translation keys: the button, the panel's date label and its Confirm. */
export const ACTION_KEYS: Record<
  ClientCommand,
  { readonly label: string; readonly date: string; readonly confirm: string }
> = {
  activate: {
    label: 'CLIENTS.ACTIVATE',
    date: 'CLIENTS.ACTIVATION_DATE',
    confirm: 'CLIENTS.ACTIVATE_CONFIRM',
  },
  reject: {
    label: 'CLIENTS.ACTIONS.REJECT',
    date: 'CLIENTS.ACTIONS.REJECTION_DATE',
    confirm: 'CLIENTS.ACTIONS.REJECT_CONFIRM',
  },
  withdraw: {
    label: 'CLIENTS.ACTIONS.WITHDRAW',
    date: 'CLIENTS.ACTIONS.WITHDRAWAL_DATE',
    confirm: 'CLIENTS.ACTIONS.WITHDRAW_CONFIRM',
  },
  close: {
    label: 'CLIENTS.ACTIONS.CLOSE',
    date: 'CLIENTS.ACTIONS.CLOSURE_DATE',
    confirm: 'CLIENTS.ACTIONS.CLOSE_CONFIRM',
  },
  reactivate: {
    label: 'CLIENTS.ACTIONS.REACTIVATE',
    date: 'CLIENTS.ACTIONS.REACTIVATION_DATE',
    confirm: 'CLIENTS.ACTIONS.REACTIVATE_CONFIRM',
  },
  undoRejection: {
    label: 'CLIENTS.ACTIONS.UNDO_REJECTION',
    date: 'CLIENTS.ACTIONS.REOPENED_DATE',
    confirm: 'CLIENTS.ACTIONS.UNDO_REJECTION_CONFIRM',
  },
  undoWithdrawal: {
    label: 'CLIENTS.ACTIONS.UNDO_WITHDRAWAL',
    date: 'CLIENTS.ACTIONS.REOPENED_DATE',
    confirm: 'CLIENTS.ACTIONS.UNDO_WITHDRAWAL_CONFIRM',
  },
};
