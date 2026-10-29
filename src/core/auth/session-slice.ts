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

import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Session } from '@/core/adapters/api/auth.api';

import { permissionsSatisfy, type Access } from './permissions';

/** Why the user was returned to sign-in without asking. Shown on the sign-in screen. */
export const SIGN_OUT_REASONS = ['session-expired', 'inactivity'] as const;
export type SignOutReason = (typeof SIGN_OUT_REASONS)[number];

export function asSignOutReason(value: unknown): SignOutReason | null {
  return SIGN_OUT_REASONS.find((r) => r === value) ?? null;
}

export type SessionState =
  | { readonly status: 'restoring' }
  | { readonly status: 'signedOut'; readonly reason: SignOutReason | null }
  /** The password was accepted; the server still wants a second factor. Not signed in. */
  | { readonly status: 'twoFactor'; readonly pending: Session }
  | { readonly status: 'signedIn'; readonly session: Session };

const initialState = { status: 'restoring' } as SessionState;

/**
 * Who is signed in (ADR 0004). Only `SessionStore` dispatches these: it does the persisting and
 * the server calls that go with each change, then records the outcome here.
 */
export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    signedIn: (_state, { payload }: PayloadAction<Session>): SessionState => ({
      status: 'signedIn',
      session: payload,
    }),
    twoFactorBegun: (_state, { payload }: PayloadAction<Session>): SessionState => ({
      status: 'twoFactor',
      pending: payload,
    }),
    signedOut: (_state, { payload }: PayloadAction<SignOutReason | null>): SessionState => ({
      status: 'signedOut',
      reason: payload,
    }),
  },
});

export const { signedIn, twoFactorBegun, signedOut } = sessionSlice.actions;

/** Any store that holds the session slice. */
export interface WithSession {
  readonly session: SessionState;
}

const NONE: readonly string[] = [];

export const selectSession = (state: WithSession): SessionState => state.session;

/** The signed-in user's permission codes; empty (the same array each time) when signed out. */
export const selectGranted = (state: WithSession): readonly string[] => {
  const s = state.session;
  return s.status === 'signedIn' ? s.session.permissions : NONE;
};

const selectGrantedSet = createSelector([selectGranted], (granted) => new Set(granted));

/** Whether the signed-in user satisfies `access` (`null` = ungated). */
export const selectPermitted = (state: WithSession, access: Access | null): boolean =>
  permissionsSatisfy(selectGrantedSet(state), access);
