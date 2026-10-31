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

import notAuthorized from '@/testing/fixtures/backend/stack.refusal.not-authorized.json';

import { AppError, toAppError, toNetworkError } from './app-error';

describe('toAppError: the captured authorization refusal', () => {
  it('is a permission refusal, though it fills errors[] like a domain rule', () => {
    expect(toAppError(403, notAuthorized).kind).toBe('forbidden');
  });
});

describe('toAppError', () => {
  it('separates a domain-rule 403 from a permission 403', () => {
    const rule = toAppError(403, {
      userMessageGlobalisationCode: 'validation.msg.domain.rule.violation',
      defaultUserMessage: 'Group cannot be closed because of active clients',
      errors: [{ developerMessage: 'Group cannot be closed because of active clients' }],
    });
    expect(rule.kind).toBe('domainRule');
    expect(rule.summary).toBe('Group cannot be closed because of active clients');

    const perm = toAppError(403, { developerMessage: 'NOT_ALLOWED: CREATE_CLIENT' });
    expect(perm.kind).toBe('forbidden');
    expect(perm.summary).toBeNull();
  });

  it('collects every field error, unwrapping the nested args[0].value form', () => {
    const e = toAppError(400, {
      defaultUserMessage: 'Validation errors exist.',
      errors: [
        { parameterName: 'firstname', developerMessage: 'The parameter `firstname` is mandatory.' },
        {
          parameterName: 'id',
          developerMessage: 'Validation errors exist.',
          args: [
            {
              value: {
                parameterName: 'approvedLoanAmount',
                defaultUserMessage: 'must be greater than 0',
              },
            },
          ],
        },
      ],
    });
    expect(e.kind).toBe('validation');
    expect(e.messages).toEqual([
      { field: 'firstname', message: 'The parameter `firstname` is mandatory.', code: null },
      { field: 'approvedLoanAmount', message: 'must be greater than 0', code: null },
    ]);
  });

  it("keeps each error's own code (captured duplicate-identifier refusal)", async () => {
    const duplicate = (await import('@/testing/fixtures/backend/client.identifier.duplicate.json'))
      .default;
    const e = toAppError(403, duplicate);
    expect(e.kind).toBe('domainRule');
    expect(e.messages).toEqual([
      {
        field: 'id',
        message: duplicate.errors[0]!.developerMessage,
        code: 'error.msg.clientIdentifier.identityKey.duplicate',
      },
    ]);
  });

  it.each([
    [401, 'unauthorized'],
    [404, 'notFound'],
    [408, 'timeout'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('%i → %s', (status, kind) => {
    expect(toAppError(status, null).kind).toBe(kind);
  });

  it('survives a non-JSON body', () => {
    const e = toAppError(502, '<html>Bad Gateway</html>');
    expect(e).toBeInstanceOf(AppError);
    expect(e.messages).toEqual([]);
  });
});

describe('toNetworkError', () => {
  it('classifies a rejected fetch and a timeout', () => {
    expect(toNetworkError(new TypeError('fetch failed')).kind).toBe('network');
    const timeout = Object.assign(new Error('t'), { name: 'RequestTimeoutError' });
    expect(toNetworkError(timeout).kind).toBe('timeout');
  });
});
