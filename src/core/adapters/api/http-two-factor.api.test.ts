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

import { fakeApi } from '@/testing/fake-api';

import { HttpTwoFactorApi, mapMethods } from './http-two-factor.api';

const REFUSED = {
  userMessageGlobalisationCode: 'validation.msg.domain.rule.violation',
  defaultUserMessage: 'Errors contain reason for domain rule violation.',
  errors: [{ defaultUserMessage: 'The provided one time token is invalid' }],
};

describe('HttpTwoFactorApi', () => {
  it('maps the delivery channels, dropping nameless ones, and treats an empty body as none', async () => {
    expect(
      mapMethods([{ name: 'email', target: 'a***@example.org' }, { target: 'x' }, { name: 'sms' }]),
    ).toEqual([
      { name: 'email', target: 'a***@example.org' },
      { name: 'sms', target: '' },
    ]);
    expect(mapMethods(null)).toEqual([]);
    const http = new HttpTwoFactorApi(fakeApi({ 'GET /v1/twofactor': [200, null] }).client);
    expect(await http.methods()).toEqual([]);
  });

  it('sends a code through the chosen channel', async () => {
    const api = fakeApi({ 'POST /v1/twofactor': [200, { tokenLiveTimeInSec: 300 }] });
    await new HttpTwoFactorApi(api.client).request('sms');
    expect(api.requests[0]!.query.get('deliveryMethod')).toBe('sms');
  });

  it('exchanges a code for the TFA token', async () => {
    const api = fakeApi({
      'POST /v1/twofactor/validate': [200, { token: 'tfa-1', validFrom: 0, validTo: 1 }],
    });
    expect(await new HttpTwoFactorApi(api.client).validate('NMKH4')).toBe('tfa-1');
    expect(api.requests[0]!.query.get('token')).toBe('NMKH4');
  });

  it('rejects a refused code as a domain-rule AppError carrying the reason', async () => {
    const http = new HttpTwoFactorApi(
      fakeApi({ 'POST /v1/twofactor/validate': [403, REFUSED] }).client,
    );
    await expect(http.validate('WRONG')).rejects.toMatchObject({
      kind: 'domainRule',
      messages: [{ field: null, message: 'The provided one time token is invalid' }],
    });
  });

  it('invalidates a token', async () => {
    const api = fakeApi({ 'POST /v1/twofactor/invalidate': [200, { resourceId: 1 }] });
    await new HttpTwoFactorApi(api.client).invalidate('tfa-1');
    expect(api.requests[0]!.body).toEqual({ token: 'tfa-1' });
  });
});
