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

import { useSyncExternalStore, type ReactNode } from 'react';

/**
 * A stand-in for expo-router in component tests: links render as anchors, redirects render a
 * marker the test can assert on, and navigation calls are recorded.
 */
export const routerCalls: {
  replace: unknown[];
  push: unknown[];
  dismissTo: unknown[];
  setParams: unknown[];
} = {
  replace: [],
  push: [],
  dismissTo: [],
  setParams: [],
};
/** The current route's query. `setParams` merges into it, dropping `undefined` values. */
export const searchParams: Record<string, string | undefined> = {};

// Screens re-render when `setParams` changes the query, as they do under expo-router.
const listeners = new Set<() => void>();
let paramsVersion = 0;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// One router object, as expo-router's is stable across renders (screens list it in effect deps).
const router = {
  replace: (to: unknown) => routerCalls.replace.push(to),
  push: (to: unknown) => routerCalls.push.push(to),
  dismissTo: (to: unknown) => routerCalls.dismissTo.push(to),
  setParams: (params: Record<string, string | undefined>) => {
    routerCalls.setParams.push(params);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) Reflect.deleteProperty(searchParams, key);
      else searchParams[key] = value;
    }
    paramsVersion += 1;
    listeners.forEach((listener) => listener());
  },
};

export const expoRouterMock = {
  Link: ({ href, children, testID }: { href: string; children: ReactNode; testID?: string }) => (
    <a href={href} data-testid={testID}>
      {children}
    </a>
  ),
  Redirect: ({ href }: { href: unknown }) => (
    <div data-testid="redirect">{JSON.stringify(href)}</div>
  ),
  useRouter: () => router,
  useLocalSearchParams: () => {
    useSyncExternalStore(subscribe, () => paramsVersion);
    return { ...searchParams };
  },
  usePathname: () => '/home',
};

export function resetRouterMock() {
  routerCalls.replace.length = 0;
  routerCalls.push.length = 0;
  routerCalls.dismissTo.length = 0;
  routerCalls.setParams.length = 0;
  for (const key of Object.keys(searchParams)) Reflect.deleteProperty(searchParams, key);
}
