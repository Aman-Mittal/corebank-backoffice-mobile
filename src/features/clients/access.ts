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

import type { Access } from '@/core/auth/permissions';

/** What each client screen and action requires; routes and controls read the same values. */
export const CLIENT_ACCESS = {
  read: { anyOf: ['READ_CLIENT'] },
  create: { anyOf: ['CREATE_CLIENT'] },
  activate: { anyOf: ['ACTIVATE_CLIENT'] },
  reject: { anyOf: ['REJECT_CLIENT'] },
  withdraw: { anyOf: ['WITHDRAW_CLIENT'] },
  close: { anyOf: ['CLOSE_CLIENT'] },
  reactivate: { anyOf: ['REACTIVATE_CLIENT'] },
  undoRejection: { anyOf: ['UNDOREJECT_CLIENT'] },
  undoWithdrawal: { anyOf: ['UNDOWITHDRAWAL_CLIENT'] },
  assignStaff: { anyOf: ['ASSIGNSTAFF_CLIENT'] },
  unassignStaff: { anyOf: ['UNASSIGNSTAFF_CLIENT'] },
  proposeTransfer: { anyOf: ['PROPOSETRANSFER_CLIENT'] },
  proposeAndAcceptTransfer: { anyOf: ['PROPOSEANDACCEPTTRANSFER_CLIENT'] },
  acceptTransfer: { anyOf: ['ACCEPTTRANSFER_CLIENT'] },
  rejectTransfer: { anyOf: ['REJECTTRANSFER_CLIENT'] },
  withdrawTransfer: { anyOf: ['WITHDRAWTRANSFER_CLIENT'] },
  readIdentifiers: { anyOf: ['READ_CLIENTIDENTIFIER'] },
  createIdentifier: { anyOf: ['CREATE_CLIENTIDENTIFIER'] },
  deleteIdentifier: { anyOf: ['DELETE_CLIENTIDENTIFIER'] },
  readNotes: { anyOf: ['READ_CLIENTNOTE'] },
  createNote: { anyOf: ['CREATE_CLIENTNOTE'] },
  updateNote: { anyOf: ['UPDATE_CLIENTNOTE'] },
  deleteNote: { anyOf: ['DELETE_CLIENTNOTE'] },
  readCharges: { anyOf: ['READ_CLIENTCHARGE'] },
  createCharge: { anyOf: ['CREATE_CLIENTCHARGE'] },
  payCharge: { anyOf: ['PAY_CLIENTCHARGE'] },
  waiveCharge: { anyOf: ['WAIVE_CLIENTCHARGE'] },
  deleteCharge: { anyOf: ['DELETE_CLIENTCHARGE'] },
  readFamily: { anyOf: ['READ_FAMILYMEMBERS'] },
  createFamilyMember: { anyOf: ['CREATE_FAMILYMEMBERS'] },
  updateFamilyMember: { anyOf: ['UPDATE_FAMILYMEMBERS'] },
  deleteFamilyMember: { anyOf: ['DELETE_FAMILYMEMBERS'] },
} as const satisfies Record<string, Access>;
