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

import { Redirect } from 'expo-router';

import { useSession } from '@/core/auth/useSession';
import { LoadingScreen } from '@/ui/LoadingScreen';

/** `/` goes home when signed in, otherwise to sign-in. */
export default function Index() {
  const { status } = useSession();
  if (status === 'restoring') return <LoadingScreen />;
  return <Redirect href={status === 'signedIn' ? '/home' : '/login'} />; // twoFactor → the step
}
