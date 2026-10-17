// Copyright 2026 Aman Mittal
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Maestro runScript (GraalJS, on the host): an active client and a closure reason, through the
// REST API of the e2e stack. Answers output.client.{lastname, reason}. API_URL defaults to the
// stack as the host sees it; the stack's demo credentials are its well-known defaults.
var base =
  typeof API_URL !== 'undefined' ? API_URL : 'https://localhost:8443/fineract-provider/api';
var headers = {
  'Fineract-Platform-TenantId': 'default',
  Authorization: 'Basic bWlmb3M6cGFzc3dvcmQ=',
  'Content-Type': 'application/json',
};
var reason = 'E2E closure reason';

var codes = json(http.get(base + '/v1/codes', { headers: headers }).body);
var code = codes.filter(function (c) {
  return c.name === 'ClientClosureReason';
})[0];
var values = json(
  http.get(base + '/v1/codes/' + code.id + '/codevalues', { headers: headers }).body,
);
if (
  !values.some(function (v) {
    return v.name === reason;
  })
) {
  http.post(base + '/v1/codes/' + code.id + '/codevalues', {
    headers: headers,
    body: JSON.stringify({ name: reason, position: values.length + 1, isActive: true }),
  });
}

var lastname = 'E2E' + Date.now().toString(36);
http.post(base + '/v1/clients', {
  headers: headers,
  body: JSON.stringify({
    officeId: 1,
    legalFormId: 1,
    firstname: 'Life',
    lastname: lastname,
    submittedOnDate: '2026-01-05',
    active: true,
    activationDate: '2026-01-05',
    locale: 'en',
    dateFormat: 'yyyy-MM-dd',
  }),
});

output.client = { lastname: lastname, reason: reason };
