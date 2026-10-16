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

import type { ReactNode } from 'react';

/**
 * A stand-in for expo-router in component tests: links render as anchors, redirects render a
 * marker the test can assert on, and navigation calls are recorded.
 */
export const routerCalls: { replace: unknown[]; push: unknown[]; dismissTo: unknown[] } = {
  replace: [],
  push: [],
  dismissTo: [],
};
export const searchParams: { reason?: string } = {};

export const expoRouterMock = {
  Link: ({ href, children, testID }: { href: string; children: ReactNode; testID?: string }) => (
    <a href={href} data-testid={testID}>
      {children}
    </a>
  ),
  Redirect: ({ href }: { href: unknown }) => (
    <div data-testid="redirect">{JSON.stringify(href)}</div>
  ),
  useRouter: () => ({
    replace: (to: unknown) => routerCalls.replace.push(to),
    push: (to: unknown) => routerCalls.push.push(to),
    dismissTo: (to: unknown) => routerCalls.dismissTo.push(to),
  }),
  useLocalSearchParams: () => searchParams,
  usePathname: () => '/home',
};

export function resetRouterMock() {
  routerCalls.replace.length = 0;
  routerCalls.push.length = 0;
  routerCalls.dismissTo.length = 0;
  delete searchParams.reason;
}
