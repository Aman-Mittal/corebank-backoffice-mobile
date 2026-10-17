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

// Maestro runScript (GraalJS, on the host): a loan officer in the head office, through the REST
// API of the e2e stack, which starts with no staff. Answers output.staff.{id, lastname}.
var base =
  typeof API_URL !== 'undefined' ? API_URL : 'https://localhost:8443/fineract-provider/api';
var headers = {
  'Fineract-Platform-TenantId': 'default',
  Authorization: 'Basic bWlmb3M6cGFzc3dvcmQ=',
  'Content-Type': 'application/json',
};

var lastname = 'E2E' + Date.now().toString(36);
var res = http.post(base + '/v1/staff', {
  headers: headers,
  body: JSON.stringify({
    officeId: 1,
    firstname: 'Maestro',
    lastname: lastname,
    isLoanOfficer: true,
    isActive: true,
    joiningDate: '2026-01-05',
    locale: 'en',
    dateFormat: 'yyyy-MM-dd',
  }),
});
if (res.status !== 200) throw new Error('POST /staff answered ' + res.status + ': ' + res.body);

output.staff = { id: json(res.body).resourceId, lastname: lastname };
