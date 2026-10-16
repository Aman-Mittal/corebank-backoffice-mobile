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

import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/core/auth/useSession';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { AppShell } from '@/ui/shell/AppShell';

/**
 * Guards every signed-in route. Signed out — including by a 401 mid-session — goes to sign-in,
 * carrying the reason so the sign-in screen can explain it.
 */
export default function SignedInLayout() {
  const state = useSession();
  if (state.status === 'restoring') return <LoadingScreen />;
  // A pending second factor is not a session: back to sign-in, which shows the step.
  if (state.status === 'twoFactor') return <Redirect href="/login" />;
  if (state.status === 'signedOut') {
    return state.reason ? (
      <Redirect href={{ pathname: '/login', params: { reason: state.reason } }} />
    ) : (
      <Redirect href="/login" />
    );
  }
  return (
    <AppShell>
      <Stack screenOptions={{ headerShown: false }} />
    </AppShell>
  );
}
