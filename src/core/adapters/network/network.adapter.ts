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

import { token } from '../registry';

/**
 * Whether the device can reach a network at all.
 *
 * It answers "is there a connection", never "is the server up": a captive portal is online and
 * still unreachable, and the HTTP pipeline's own errors are what report that. The answer feeds
 * TanStack Query's `onlineManager` and the offline banner.
 */
export interface NetworkAdapter {
  isOnline(): Promise<boolean>;
  /** Calls `listener` on every change. Returns the unsubscribe function. */
  subscribe(listener: (online: boolean) => void): () => void;
}

export const NETWORK = token<NetworkAdapter>('NetworkAdapter');
