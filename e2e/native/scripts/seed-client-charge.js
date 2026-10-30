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

// Maestro runScript (GraalJS, on the host): a client charge definition and an active client,
// through the REST API of the e2e stack. Answers output.charge.{id, name} and
// output.client.{id, lastname}. API_URL defaults to the stack as the host sees it; the stack's
// demo credentials are its well-known defaults.
var base =
  typeof API_URL !== 'undefined' ? API_URL : 'https://localhost:8443/fineract-provider/api';
var headers = {
  'Fineract-Platform-TenantId': 'default',
  Authorization: 'Basic bWlmb3M6cGFzc3dvcmQ=',
  'Content-Type': 'application/json',
};
var name = 'E2E Client Fee';

var charges = json(http.get(base + '/v1/charges', { headers: headers }).body);
var charge = charges.filter(function (c) {
  return c.name === name;
})[0];
var chargeId;
if (charge) {
  chargeId = charge.id;
} else {
  var created = http.post(base + '/v1/charges', {
    headers: headers,
    body: JSON.stringify({
      name: name,
      chargeAppliesTo: 3,
      currencyCode: 'USD',
      amount: 100,
      chargeTimeType: 2,
      chargeCalculationType: 1,
      active: true,
      penalty: false,
      locale: 'en',
    }),
  });
  if (created.status !== 200) {
    throw new Error('POST /charges answered ' + created.status + ': ' + created.body);
  }
  chargeId = json(created.body).resourceId;
}

var lastname = 'E2E' + Date.now().toString(36);
var res = http.post(base + '/v1/clients', {
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
if (res.status !== 200) throw new Error('POST /clients answered ' + res.status + ': ' + res.body);

output.charge = { id: chargeId, name: name };
output.client = { id: json(res.body).clientId, lastname: lastname };
