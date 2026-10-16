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

import type { Session } from '@/core/adapters/api/auth.api';
import type { SecureStorageAdapter } from '@/core/adapters/secure-storage/secure-storage.adapter';
import type { AuthState } from '@/core/http/auth';

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

/** Called on sign-out of a session holding a TFA token, so the server stops accepting it. */
export type TokenInvalidator = (tfaToken: string) => Promise<void>;

/**
 * The single owner of "who is signed in".
 *
 * Framework-free so the HTTP pipeline (which runs outside React) and components read the same
 * state: the pipeline through `authState()`, components through `useSession()`. The session is
 * persisted to SECURE_STORAGE only — on web that is tab-scoped `sessionStorage`, so it survives a
 * reload but not the tab, and never reaches `localStorage`.
 */
export class SessionStore {
  private state: SessionState = { status: 'restoring' };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly secure: SecureStorageAdapter,
    /** The tenant to send before anyone has signed in. */
    private readonly fallbackTenant: () => string,
    private readonly invalidateTfaToken: TokenInvalidator = async () => undefined,
  ) {}

  getState = (): SessionState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Reads a persisted session at startup. A corrupt one is discarded, not trusted. */
  async restore(): Promise<void> {
    const raw = await this.secure.get('session');
    const parsed = raw ? parseSession(raw) : null;
    if (raw && !parsed) await this.secure.clear();
    if (!parsed) this.set({ status: 'signedOut', reason: null });
    else if (parsed.pendingTwoFactor) this.set({ status: 'twoFactor', pending: parsed.session });
    else this.set({ status: 'signedIn', session: parsed.session });
  }

  async signIn(session: Session): Promise<void> {
    await this.secure.set('session', JSON.stringify(session));
    this.set({ status: 'signedIn', session });
  }

  /**
   * Holds a password-accepted session that still needs its second factor. It is persisted with a
   * pending marker, so a reload part-way through returns to the step rather than to the password
   * form — and, crucially, not into the app: guarded routes treat `twoFactor` as signed out.
   */
  async beginTwoFactor(pending: Session): Promise<void> {
    await this.secure.set('session', JSON.stringify({ ...pending, pendingTwoFactor: true }));
    this.set({ status: 'twoFactor', pending });
  }

  /** Completes the second factor with the token the server issued, and signs in. */
  async completeTwoFactor(tfaToken: string): Promise<void> {
    if (this.state.status !== 'twoFactor')
      throw new Error('No sign-in is waiting for a second factor');
    await this.signIn({ ...this.state.pending, tfaToken });
  }

  /**
   * Ends the session. Idempotent: a page with several requests in flight sees several 401s, and
   * only the first may change the state, or a later one would overwrite the reason with `null`.
   */
  async signOut(reason: SignOutReason | null = null): Promise<void> {
    const before = this.state;
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
    if (this.state.status === 'signedOut') return;
    this.set({ status: 'signedOut', reason });
    await this.secure.clear();
  }

  /** What the HTTP pipeline attaches to API requests. */
  authState = (): AuthState => {
    const s = this.state;
    const session =
      s.status === 'signedIn' ? s.session : s.status === 'twoFactor' ? s.pending : null;
    if (!session) return { tenantId: this.fallbackTenant(), credential: null, tfaToken: null };
    return {
      tenantId: session.tenantId,
      credential: { scheme: session.scheme, value: session.credential },
      tfaToken: s.status === 'signedIn' ? session.tfaToken : null,
    };
  };

  private set(next: SessionState): void {
    this.state = next;
    for (const l of this.listeners) l();
  }
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
