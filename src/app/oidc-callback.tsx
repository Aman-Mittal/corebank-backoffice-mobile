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

import * as WebBrowser from 'expo-web-browser';

import { LoadingScreen } from '@/ui/LoadingScreen';

// The identity provider redirects here. On web this page runs in the sign-in popup and hands the
// result back to the window that opened it; on native the auth session intercepts the redirect.
WebBrowser.maybeCompleteAuthSession();

export default function OidcCallback() {
  return <LoadingScreen />;
}
