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

import captured from '@/testing/fixtures/backend/authentication.json';
import { createFakeAdapters } from '@/testing/fake-adapters';
import { mapSession } from '@/core/adapters/api/http-auth.api';
import { passwordFormToggled } from '@/features/profile/profile-slice';

import { asSignOutReason, SessionStore } from './session-store';

const session = mapSession(captured, 'acme');

const make = () => {
  const fakes = createFakeAdapters();
  return { fakes, store: new SessionStore(fakes.secureStorage, () => 'default') };
};

describe('SessionStore', () => {
  it('keeps its state in the store it is given, and reports session changes only', async () => {
    const fakes = createFakeAdapters();
    await fakes.session.restore();
    const heard = vi.fn();
    fakes.session.subscribe(heard);
    fakes.store.dispatch(passwordFormToggled());
    expect(heard).not.toHaveBeenCalled();
    await fakes.session.signIn(session);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(fakes.store.getState().session).toEqual({ status: 'signedIn', session });
  });

  it('starts restoring, then signs out when nothing is persisted', async () => {
    const { store } = make();
    expect(store.getState().status).toBe('restoring');
    await store.restore();
    expect(store.getState()).toEqual({ status: 'signedOut', reason: null });
  });

  it('persists a sign-in to secure storage and restores it', async () => {
    const { fakes, store } = make();
    await store.signIn(session);
    const again = new SessionStore(fakes.secureStorage, () => 'default');
    await again.restore();
    expect(again.getState()).toEqual({ status: 'signedIn', session });
  });

  it('discards a corrupt persisted session instead of trusting it', async () => {
    const { fakes, store } = make();
    await fakes.secureStorage.set('session', '{"userId":1}');
    await store.restore();
    expect(store.getState().status).toBe('signedOut');
    expect(fakes.secureStorage.entries.size).toBe(0);
    await fakes.secureStorage.set('session', 'not json');
    await store.restore();
    expect(store.getState().status).toBe('signedOut');
  });

  it('gives the pipeline Basic credentials and the session tenant only while signed in', async () => {
    const { store } = make();
    expect(store.authState()).toEqual({ tenantId: 'default', credential: null, tfaToken: null });
    await store.signIn(session);
    expect(store.authState()).toEqual({
      tenantId: 'acme',
      credential: { scheme: 'Basic', value: 'bWlmb3M6cGFzc3dvcmQ=' },
      tfaToken: null,
    });
  });

  it('keeps the first sign-out reason when several 401s arrive together', async () => {
    const { fakes, store } = make();
    await store.signIn(session);
    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getState().status));
    await Promise.all([store.signOut('session-expired'), store.signOut(), store.signOut()]);
    expect(store.getState()).toEqual({ status: 'signedOut', reason: 'session-expired' });
    expect(seen).toEqual(['signedOut']);
    expect(fakes.secureStorage.entries.size).toBe(0);
  });

  it('recognises only the known reasons', () => {
    expect(asSignOutReason('inactivity')).toBe('inactivity');
    expect(asSignOutReason('session-expired')).toBe('session-expired');
    expect(asSignOutReason('not-a-real-reason')).toBeNull();
    expect(asSignOutReason(undefined)).toBeNull();
  });

  it('holds a pending second factor: Basic credential, no TFA token, not signed in, resumed on reload', async () => {
    const { fakes, store } = make();
    await store.beginTwoFactor(session);
    expect(store.getState().status).toBe('twoFactor');
    expect(store.authState()).toEqual({
      tenantId: 'acme',
      credential: { scheme: 'Basic', value: session.credential },
      tfaToken: null,
    });
    const again = new SessionStore(fakes.secureStorage, () => 'default');
    await again.restore();
    expect(again.getState()).toEqual({ status: 'twoFactor', pending: session });
  });

  it('completes the second factor, then sends the TFA token and restores it', async () => {
    const { fakes, store } = make();
    await store.beginTwoFactor(session);
    await store.completeTwoFactor('tfa-1');
    expect(store.authState().tfaToken).toBe('tfa-1');
    const again = new SessionStore(fakes.secureStorage, () => 'default');
    await again.restore();
    expect(again.getState()).toMatchObject({ status: 'signedIn', session: { tfaToken: 'tfa-1' } });
  });

  it('refuses to complete a second factor nobody is waiting for', async () => {
    await expect(make().store.completeTwoFactor('x')).rejects.toThrow(/waiting/);
  });

  it('invalidates the TFA token on a voluntary sign-out, once, and signs out even if that fails', async () => {
    const fakes = createFakeAdapters();
    const invalidate = vi.fn(async () => {
      throw new Error('offline');
    });
    const store = new SessionStore(fakes.secureStorage, () => 'default', invalidate);
    await store.signIn({ ...session, tfaToken: 'tfa-1' });
    await store.signOut();
    expect(invalidate).toHaveBeenCalledExactlyOnceWith('tfa-1');
    expect(store.getState().status).toBe('signedOut');
  });

  it('does not invalidate when there is no token, or when the server already ended the session', async () => {
    const fakes = createFakeAdapters();
    const invalidate = vi.fn(async () => undefined);
    const store = new SessionStore(fakes.secureStorage, () => 'default', invalidate);
    await store.beginTwoFactor(session);
    await store.signOut();
    await store.signIn({ ...session, tfaToken: 'tfa-1' });
    await store.signOut('session-expired');
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('gives a Bearer session a Bearer credential', async () => {
    const { store } = make();
    await store.signIn({ ...session, scheme: 'Bearer', credential: 'idp-token' });
    expect(store.authState().credential).toEqual({ scheme: 'Bearer', value: 'idp-token' });
  });
});
