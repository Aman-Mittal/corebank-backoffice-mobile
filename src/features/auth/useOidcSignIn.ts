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
  AuthRequest,
  exchangeCodeAsync,
  fetchDiscoveryAsync,
  makeRedirectUri,
  ResponseType,
  type DiscoveryDocument,
} from 'expo-auth-session';
import { useEffect, useRef, useState } from 'react';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { USER_DETAILS_API } from '@/core/adapters/api/user-details.api';
import { useSession } from '@/core/auth/useSession';
import { DEPLOYMENT_CONFIG, type OidcConfig } from '@/core/config/deployment-config';

export type OidcOutcome = 'signedIn' | 'cancelled';

interface Prepared {
  readonly discovery: DiscoveryDocument;
  readonly request: AuthRequest;
  readonly redirectUri: string;
}

async function prepare(config: OidcConfig): Promise<Prepared> {
  const discovery = await fetchDiscoveryAsync(config.issuer);
  const redirectUri = makeRedirectUri({ scheme: 'corebank', path: 'oidc-callback' });
  const request = new AuthRequest({
    clientId: config.clientId,
    scopes: [...config.scopes],
    redirectUri,
    responseType: ResponseType.Code,
    usePKCE: true,
  });
  await request.makeAuthUrlAsync(discovery);
  return { discovery, request, redirectUri };
}

/**
 * Identity-provider sign-in (authorization code + PKCE), or `null` when the deployment configures
 * no provider.
 *
 * The request is prepared ahead of the click: on web the provider opens in a popup, and browsers
 * only allow a popup opened directly from the click, not after an `await`.
 */
export function useOidcSignIn() {
  const config = useAdapter(DEPLOYMENT_CONFIG).get().oidc;
  const userDetails = useAdapter(USER_DETAILS_API);
  const { store } = useSession();
  const prepared = useRef<Promise<Prepared> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!config) return;
    const p = prepare(config);
    p.catch(() => undefined);
    prepared.current = p;
  }, [config]);

  if (!config) return null;

  const signIn = async (tenantId: string): Promise<OidcOutcome> => {
    setBusy(true);
    try {
      const { discovery, request, redirectUri } = await (prepared.current ?? prepare(config));
      const result = await request.promptAsync(discovery);
      // A fresh request for the next attempt: PKCE verifiers and state must not be reused.
      prepared.current = prepare(config);
      prepared.current.catch(() => undefined);
      if (result.type !== 'success' || typeof result.params.code !== 'string') return 'cancelled';
      const tokens = await exchangeCodeAsync(
        {
          clientId: config.clientId,
          code: result.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        discovery,
      );
      await store.signIn(await userDetails.sessionFor(tokens.accessToken, tenantId));
      return 'signedIn';
    } finally {
      setBusy(false);
    }
  };

  return { label: config.label, busy, signIn };
}
