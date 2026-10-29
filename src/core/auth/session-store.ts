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

import { configureStore, type UnknownAction } from '@reduxjs/toolkit';

import type { Session } from '@/core/adapters/api/auth.api';
import type { SecureStorageAdapter } from '@/core/adapters/secure-storage/secure-storage.adapter';
import type { AuthState } from '@/core/http/auth';

import {
  sessionSlice,
  signedIn,
  signedOut,
  twoFactorBegun,
  type SessionState,
  type SignOutReason,
  type WithSession,
} from './session-slice';

export {
  asSignOutReason,
  SIGN_OUT_REASONS,
  type SessionState,
  type SignOutReason,
} from './session-slice';

/** The Redux store the session is kept in: the app's store, or one of its own in a test. */
export interface SessionHost {
  getState(): WithSession;
  dispatch(action: UnknownAction): unknown;
  subscribe(listener: () => void): () => void;
}

const ownHost = (): SessionHost => configureStore({ reducer: { session: sessionSlice.reducer } });

/** Called on sign-out of a session holding a TFA token, so the server stops accepting it. */
export type TokenInvalidator = (tfaToken: string) => Promise<void>;

/**
 * The single owner of "who is signed in".
 *
 * The state itself is the Redux store's `session` slice (ADR 0004); this class does the work
 * around each change (persisting, invalidating a second-factor token) and then dispatches it. The
 * HTTP pipeline, which runs outside React, reads `authState()`; components select from the store
 * through `useSession()` and `usePermission()`. The session is persisted to SECURE_STORAGE only:
 * on web that is tab-scoped `sessionStorage`, so it survives a reload but not the tab, and never
 * reaches `localStorage`.
 */
export class SessionStore {
  constructor(
    private readonly secure: SecureStorageAdapter,
    /** The tenant to send before anyone has signed in. */
    private readonly fallbackTenant: () => string,
    private readonly invalidateTfaToken: TokenInvalidator = async () => undefined,
    /** The store the state lives in. The app passes its own; a test may leave it out. */
    readonly host: SessionHost = ownHost(),
  ) {}

  getState = (): SessionState => this.host.getState().session;

  /** Calls `listener` when the session changes; actions of other slices are not reported. */
  subscribe = (listener: () => void): (() => void) => {
    let last = this.getState();
    return this.host.subscribe(() => {
      const next = this.getState();
      if (next === last) return;
      last = next;
      listener();
    });
  };

  /** Reads a persisted session at startup. A corrupt one is discarded, not trusted. */
  async restore(): Promise<void> {
    const raw = await this.secure.get('session');
    const parsed = raw ? parseSession(raw) : null;
    if (raw && !parsed) await this.secure.clear();
    if (!parsed) this.host.dispatch(signedOut(null));
    else if (parsed.pendingTwoFactor) this.host.dispatch(twoFactorBegun(parsed.session));
    else this.host.dispatch(signedIn(parsed.session));
  }

  async signIn(session: Session): Promise<void> {
    await this.secure.set('session', JSON.stringify(session));
    this.host.dispatch(signedIn(session));
  }

  /**
   * Holds a password-accepted session that still needs its second factor. It is persisted with a
   * pending marker, so a reload part-way through returns to the step rather than to the password
   * form — and, crucially, not into the app: guarded routes treat `twoFactor` as signed out.
   */
  async beginTwoFactor(pending: Session): Promise<void> {
    await this.secure.set('session', JSON.stringify({ ...pending, pendingTwoFactor: true }));
    this.host.dispatch(twoFactorBegun(pending));
  }

  /** Completes the second factor with the token the server issued, and signs in. */
  async completeTwoFactor(tfaToken: string): Promise<void> {
    const state = this.getState();
    if (state.status !== 'twoFactor') throw new Error('No sign-in is waiting for a second factor');
    await this.signIn({ ...state.pending, tfaToken });
  }

  /**
   * Ends the session. Idempotent: a page with several requests in flight sees several 401s, and
   * only the first may change the state, or a later one would overwrite the reason with `null`.
   */
  async signOut(reason: SignOutReason | null = null): Promise<void> {
    const before = this.getState();
    if (before.status === 'signedOut') return;
    // Invalidate while the credentials are still attached, then forget them. A failure to
    // invalidate (network, already expired) must not keep the user signed in.
    const tfaToken = before.status === 'signedIn' ? before.session.tfaToken : null;
    if (tfaToken && reason === null) {
      try {
        await this.invalidateTfaToken(tfaToken);
      } catch {
        /* best effort: the token expires at the server anyway */
      }
    }
    if (this.getState().status === 'signedOut') return;
    this.host.dispatch(signedOut(reason));
    await this.secure.clear();
  }

  /** What the HTTP pipeline attaches to API requests. */
  authState = (): AuthState => {
    const s = this.getState();
    const session =
      s.status === 'signedIn' ? s.session : s.status === 'twoFactor' ? s.pending : null;
    if (!session) return { tenantId: this.fallbackTenant(), credential: null, tfaToken: null };
    return {
      tenantId: session.tenantId,
      credential: { scheme: session.scheme, value: session.credential },
      tfaToken: s.status === 'signedIn' ? session.tfaToken : null,
    };
  };
}

function parseSession(raw: string): { session: Session; pendingTwoFactor: boolean } | null {
  try {
    const { pendingTwoFactor, ...value } = JSON.parse(raw) as Partial<Session> & {
      pendingTwoFactor?: boolean;
    };
    const valid =
      typeof value.userId === 'number' &&
      typeof value.officeId === 'number' &&
      typeof value.credential === 'string' &&
      value.credential.length > 0 &&
      typeof value.tenantId === 'string' &&
      Array.isArray(value.permissions);
    if (!valid) return null;
    // Sessions persisted before `scheme`/`tfaToken` existed were Basic without a second factor.
    return {
      session: {
        ...value,
        scheme: value.scheme === 'Bearer' ? 'Bearer' : 'Basic',
        tfaToken: value.tfaToken ?? null,
      } as Session,
      pendingTwoFactor: pendingTwoFactor === true,
    };
  } catch {
    return null;
  }
}
