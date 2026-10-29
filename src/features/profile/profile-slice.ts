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

import {
  createAsyncThunk,
  createSlice,
  isAnyOf,
  type PayloadAction,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';

import {
  PROFILE_API,
  type PasswordChange,
  type UserProfile,
} from '@/core/adapters/api/profile.api';
import { signedIn, signedOut } from '@/core/auth/session-slice';
import { serializeAppError, type SerializedAppError } from '@/core/http/app-error';
import type { ThunkExtra } from '@/state/thunk-extra';

export interface ProfileState {
  /** Whose record `user` is, or is being read for. */
  readonly userId: number | null;
  readonly status: 'idle' | 'loading' | 'loaded' | 'failed';
  readonly user: UserProfile | null;
  readonly error: SerializedAppError | null;
  readonly passwordFormOpen: boolean;
  /** The active password policy's description; `null` when none, or when it could not be read. */
  readonly policy: string | null;
  readonly passwordStatus: 'idle' | 'saving' | 'saved' | 'failed';
  readonly passwordError: SerializedAppError | null;
}

const initialState: ProfileState = {
  userId: null,
  status: 'idle',
  user: null,
  error: null,
  passwordFormOpen: false,
  policy: null,
  passwordStatus: 'idle',
  passwordError: null,
};

const createProfileThunk = createAsyncThunk.withTypes<{
  extra: ThunkExtra;
  rejectValue: SerializedAppError;
}>();

/** Reads a user's record. A reply for a user no longer asked about is ignored. */
export const loadProfile = createProfileThunk(
  'profile/load',
  async (userId: number, { extra, rejectWithValue }) => {
    try {
      return await extra.resolve(PROFILE_API).get(userId);
    } catch (error) {
      return rejectWithValue(serializeAppError(error));
    }
  },
);

/** Reads the active password policy. Not every user may read it; then none is shown. */
export const loadPasswordPolicy = createProfileThunk(
  'profile/loadPolicy',
  async (_: undefined, { extra }) => {
    try {
      return await extra.resolve(PROFILE_API).passwordPolicy();
    } catch {
      return null;
    }
  },
);

/**
 * The single owner of the signed-in user's own record (DOCS/test-plan/P1-10-profile-state.md).
 * Reset whenever a session ends or begins, so one user's record is never shown to the next.
 */
export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  // Each reducer returns the next state rather than editing a draft: the records hold readonly
  // arrays, which Immer's draft types will not accept by assignment.
  reducers: {
    passwordFormToggled: (state): ProfileState => ({
      ...state,
      passwordFormOpen: !state.passwordFormOpen,
      passwordStatus: 'idle',
      passwordError: null,
    }),
    passwordFormClosed: (state): ProfileState => ({
      ...state,
      passwordFormOpen: false,
      passwordStatus: 'idle',
      passwordError: null,
    }),
    passwordSaving: (state): ProfileState => ({
      ...state,
      passwordStatus: 'saving',
      passwordError: null,
    }),
    passwordSaved: (state): ProfileState => ({
      ...state,
      passwordStatus: 'saved',
      passwordFormOpen: false,
    }),
    passwordFailed: (state, { payload }: PayloadAction<SerializedAppError>): ProfileState => ({
      ...state,
      passwordStatus: 'failed',
      passwordError: payload,
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProfile.pending, (state, { meta }): ProfileState => ({
        ...state,
        user: state.userId === meta.arg ? state.user : null,
        userId: meta.arg,
        status: 'loading',
        error: null,
      }))
      .addCase(loadProfile.fulfilled, (state, { meta, payload }): ProfileState =>
        state.userId === meta.arg ? { ...state, status: 'loaded', user: payload } : state,
      )
      .addCase(loadProfile.rejected, (state, { meta, payload }): ProfileState =>
        state.userId === meta.arg
          ? { ...state, status: 'failed', error: payload ?? serializeAppError(null) }
          : state,
      )
      .addCase(loadPasswordPolicy.fulfilled, (state, { payload }): ProfileState => ({
        ...state,
        policy: payload,
      }))
      .addMatcher(isAnyOf(signedIn, signedOut), () => initialState);
  },
});

export const { passwordFormToggled, passwordFormClosed } = profileSlice.actions;
const { passwordSaving, passwordSaved, passwordFailed } = profileSlice.actions;

/**
 * Changes the user's password. A plain thunk, not `createAsyncThunk`: that copies its argument
 * into every action it dispatches (`meta.arg`), and the passwords must not enter the store or its
 * action log.
 */
export function changePassword(
  userId: number,
  change: PasswordChange,
): ThunkAction<Promise<void>, unknown, ThunkExtra, UnknownAction> {
  return async (dispatch, _getState, extra) => {
    dispatch(passwordSaving());
    try {
      await extra.resolve(PROFILE_API).changePassword(userId, change);
      dispatch(passwordSaved());
    } catch (error) {
      dispatch(passwordFailed(serializeAppError(error)));
    }
  };
}

export const selectProfile = (state: { readonly profile: ProfileState }): ProfileState =>
  state.profile;
