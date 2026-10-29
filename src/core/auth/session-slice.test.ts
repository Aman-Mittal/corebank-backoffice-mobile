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

import { mapSession } from '@/core/adapters/api/http-auth.api';
import captured from '@/testing/fixtures/backend/authentication.json';

import {
  selectGranted,
  selectPermitted,
  sessionSlice,
  signedIn,
  signedOut,
  twoFactorBegun,
  type SessionState,
} from './session-slice';

const session = mapSession({ ...captured, permissions: ['READ_CLIENT'] }, 'default');
const reduce = (...actions: Parameters<typeof sessionSlice.reducer>[1][]) =>
  actions.reduce<SessionState>(sessionSlice.reducer, sessionSlice.getInitialState());
const of = (state: SessionState) => ({ session: state });

describe('session slice', () => {
  it('starts restoring, and each action gives its state', () => {
    expect(sessionSlice.getInitialState()).toEqual({ status: 'restoring' });
    expect(reduce(signedIn(session))).toEqual({ status: 'signedIn', session });
    expect(reduce(twoFactorBegun(session))).toEqual({ status: 'twoFactor', pending: session });
    expect(reduce(signedIn(session), signedOut('inactivity'))).toEqual({
      status: 'signedOut',
      reason: 'inactivity',
    });
  });

  it('grants nothing unless signed in, with the same empty list each time', () => {
    const pending = of(reduce(twoFactorBegun(session)));
    expect(selectGranted(pending)).toEqual([]);
    expect(selectGranted(pending)).toBe(selectGranted(of(reduce(signedOut(null)))));
    expect(selectGranted(of(reduce(signedIn(session))))).toEqual(['READ_CLIENT']);
  });

  it('answers permission checks by the shared rule', () => {
    const state = of(reduce(signedIn(session)));
    expect(selectPermitted(state, null)).toBe(true);
    expect(selectPermitted(state, { anyOf: ['READ_CLIENT', 'CREATE_CLIENT'] })).toBe(true);
    expect(selectPermitted(state, { allOf: ['READ_CLIENT', 'CREATE_CLIENT'] })).toBe(false);
    expect(selectPermitted(of(reduce(signedOut(null))), { anyOf: ['READ_CLIENT'] })).toBe(false);
  });
});
