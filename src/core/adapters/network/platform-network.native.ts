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

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import type { NetworkAdapter } from './network.adapter';

/**
 * Native: NetInfo. `isInternetReachable` is `null` until NetInfo has probed, and an unknown
 * answer is treated as online: blocking every action on a probe that has not finished yet would
 * be worse than letting the request itself fail.
 */
const online = (s: NetInfoState) => s.isConnected !== false && s.isInternetReachable !== false;

export function createPlatformNetwork(): NetworkAdapter {
  return {
    isOnline: async () => online(await NetInfo.fetch()),
    subscribe: (listener) => NetInfo.addEventListener((s) => listener(online(s))),
  };
}
