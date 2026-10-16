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

import { IDEMPOTENT_HEADER, type Middleware } from './pipeline';

export const DEFAULT_RETRY_COUNT = 2;
export const RETRY_BASE_DELAY_MS = 300;

/**
 * Statuses worth repeating a request for: no response at all, or the server saying "not now".
 * 500 is excluded on purpose: an unhandled server exception is deterministic far more often
 * than not, and the server answers 500 for some validation failures.
 */
export const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([408, 429, 502, 503, 504]);

export interface RetryOptions {
  readonly count?: number;
  readonly baseDelayMs?: number;
  /** Per-attempt deadline. A timeout is not retried: the caller set a deadline. */
  readonly timeoutMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Thrown when an attempt exceeds `timeoutMs`. */
export class RequestTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'RequestTimeoutError';
  }
}

/**
 * Retries transient failures of requests that are safe to repeat, backing off 300ms then 900ms.
 *
 * GET is safe by definition; anything else only with `IDEMPOTENT_HEADER`, which this strips.
 * A network failure (fetch rejecting) counts as transient, as status 0 does in a browser.
 */
export function retry(options: RetryOptions = {}): Middleware {
  const count = options.count ?? DEFAULT_RETRY_COUNT;
  const base = options.baseDelayMs ?? RETRY_BASE_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;

  return (next) => async (request) => {
    const declared = request.headers.get(IDEMPOTENT_HEADER) === 'true';
    request.headers.delete(IDEMPOTENT_HEADER);
    const attempts = request.method === 'GET' || declared ? count + 1 : 1;

    const attempt = async (): Promise<Response> => {
      // Each attempt gets its own body stream; a consumed body cannot be sent twice.
      const req = request.clone();
      if (options.timeoutMs === undefined) return next(req);
      const timeoutMs = options.timeoutMs;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new RequestTimeoutError(timeoutMs)), timeoutMs);
      });
      try {
        return await Promise.race([next(req), deadline]);
      } finally {
        clearTimeout(timer);
      }
    };

    for (let i = 1; ; i += 1) {
      try {
        const response = await attempt();
        if (i < attempts && TRANSIENT_STATUSES.has(response.status)) {
          await sleep(base * 3 ** (i - 1));
          continue;
        }
        return response;
      } catch (error) {
        if (error instanceof RequestTimeoutError || i >= attempts) throw error;
        await sleep(base * 3 ** (i - 1));
      }
    }
  };
}
