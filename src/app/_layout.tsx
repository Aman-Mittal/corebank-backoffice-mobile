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

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';

import { AdapterProvider } from '@/core/adapters/AdapterProvider';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { createAppRegistry } from '@/core/app-registry';
import { DEPLOYMENT_CONFIG } from '@/core/config/deployment-config';
import { SESSION } from '@/core/tokens';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { createQueryClient } from '@/core/query/query-client';

function Shell() {
  const { t } = useI18n();
  return (
    <>
      <Head>
        <title>{t('APP.NAME')}</title>
      </Head>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="about" options={{ headerShown: true, title: t('ABOUT.TITLE') }} />
      </Stack>
    </>
  );
}

/**
 * Root: one adapter registry and one query cache for the app's lifetime. Restores a persisted
 * session on start, and drops every cached query when the session ends, so nothing read under one
 * user is shown to the next.
 */
export default function RootLayout() {
  const [registry] = useState(() => createAppRegistry());
  const [queryClient] = useState(createQueryClient);
  // The deployment config (identity provider, later deployment flags) is read once, before any
  // screen renders, so sign-in never flickers between "with" and "without" a provider button.
  const [configReady, setConfigReady] = useState(false);
  useEffect(() => {
    void registry
      .resolve(DEPLOYMENT_CONFIG)
      .load()
      .then(() => setConfigReady(true));
  }, [registry]);

  useEffect(() => {
    const session = registry.resolve(SESSION);
    void session.restore();
    return session.subscribe(() => {
      if (session.getState().status === 'signedOut') queryClient.clear();
    });
  }, [registry, queryClient]);

  return (
    <AdapterProvider registry={registry}>
      <QueryClientProvider client={queryClient}>
        {configReady ? <Shell /> : <LoadingScreen />}
      </QueryClientProvider>
    </AdapterProvider>
  );
}
