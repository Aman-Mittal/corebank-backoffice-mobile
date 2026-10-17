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

import { clientActions, isReasoned, REASON_CODES } from './client-actions';

describe('clientActions', () => {
  it.each([
    ['pending', ['activate', 'reject', 'withdraw']],
    ['active', ['close']],
    ['closed', ['reactivate']],
    ['rejected', ['undoRejection']],
    ['withdrawn', ['undoWithdrawal']],
    ['transferInProgress', []],
    ['transferOnHold', []],
    ['unknown', []],
  ] as const)('%s offers %o', (status, commands) => {
    expect(clientActions(status)).toEqual(commands);
  });

  it('knows which commands need a reason, and the code that holds them', () => {
    expect(['reject', 'withdraw', 'close'].every((c) => isReasoned(c as 'reject'))).toBe(true);
    expect(isReasoned('activate')).toBe(false);
    expect(isReasoned('undoRejection')).toBe(false);
    expect(REASON_CODES).toEqual({
      reject: 'ClientRejectReason',
      withdraw: 'ClientWithdrawReason',
      close: 'ClientClosureReason',
    });
  });
});
