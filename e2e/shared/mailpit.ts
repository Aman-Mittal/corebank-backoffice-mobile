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

import { request as playwrightRequest } from '@playwright/test';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

/**
 * The newest one-time token Mailpit received since `since` (epoch ms), polling for up to 15 s.
 * The backend's mail reads "Your OTP login token is NMKH4." — alphanumeric, not digits.
 * Adapted from fineract-backoffice-ui's `e2e/utils/mailpit.ts`.
 */
export async function latestOtp(since = 0): Promise<string> {
  const api = await playwrightRequest.newContext();
  try {
    for (let attempt = 0; attempt < 30; attempt++) {
      const inbox = await api.get(`${MAILPIT}/api/v1/messages`);
      if (inbox.ok()) {
        const { messages = [] } = (await inbox.json()) as {
          messages?: { ID: string; Created: string }[];
        };
        const message = messages.find((m) => new Date(m.Created).getTime() >= since);
        if (message) {
          const detail = (await (
            await api.get(`${MAILPIT}/api/v1/message/${message.ID}`)
          ).json()) as {
            Text?: string;
            HTML?: string;
          };
          const token = /token is ([A-Za-z0-9]+)/.exec(detail.Text ?? detail.HTML ?? '')?.[1];
          if (token) return token;
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`No one-time token arrived at ${MAILPIT} within 15s.`);
  } finally {
    await api.dispose();
  }
}

export async function clearMailbox(): Promise<void> {
  const api = await playwrightRequest.newContext();
  try {
    await api.delete(`${MAILPIT}/api/v1/messages`);
  } finally {
    await api.dispose();
  }
}
