#!/bin/bash
# Copyright 2026 Aman Mittal
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Brings up the two-factor stack: the backend with 2FA on, plus Mailpit, with the backend's SMTP
# pointed at Mailpit. Adapted from fineract-backoffice-ui's e2e-stack-2fa.sh.
#
#   scripts/e2e-stack-2fa.sh [--fresh]   then   npm run e2e:web -- --project=two-factor
#   scripts/e2e-stack-2fa.sh --down
#
# Never run with the ordinary stack (same ports, and 2FA is process-wide), and the same memory
# floor applies (DOCS/E2E.md).

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f deploy/docker-compose-e2e.yml -f deploy/docker-compose-e2e-2fa.yml)
API="https://localhost:${MBO_E2E_API_PORT:-8443}/fineract-provider/api/v1"
TENANT_HEADER="Fineract-Platform-TenantId: default"
MIN_FREE_MB="${MBO_MIN_FREE_MB:-2048}"

if [[ "${1:-}" == "--down" ]]; then
  "${COMPOSE[@]}" down
  exit 0
fi

if command -v free >/dev/null; then
  AVAILABLE_MB=$(free -m | awk 'NR==2 {print $7}')
  if (( AVAILABLE_MB < MIN_FREE_MB )); then
    echo "❌ Only ${AVAILABLE_MB} MB available; the stack needs ~${MIN_FREE_MB} MB."
    exit 1
  fi
fi

if [[ "${1:-}" == "--fresh" ]]; then
  "${COMPOSE[@]}" down -v
fi

"${COMPOSE[@]}" up -d --wait db
docker exec -i mbo-e2e-db psql -U postgres < deploy/init-db.sql >/dev/null 2>&1 || true
"${COMPOSE[@]}" up -d backend mailpit

echo "⏳ Waiting for the backend with two-factor enabled..."
# /twofactor is the one endpoint a Basic credential opens before a second factor exists.
for _ in $(seq 1 72); do
  if [[ "$(curl -sk -o /dev/null -w '%{http_code}' -u mifos:password -H "$TENANT_HEADER" "$API/twofactor" || true)" == "200" ]]; then
    break
  fi
  sleep 5
done
if [[ "$(curl -sk -o /dev/null -w '%{http_code}' -u mifos:password -H "$TENANT_HEADER" "$API/twofactor" || true)" != "200" ]]; then
  echo "❌ The backend did not come up with two-factor enabled."
  "${COMPOSE[@]}" logs --tail=50 backend
  exit 1
fi

echo "📮 Pointing SMTP at Mailpit..."
docker exec -i mbo-e2e-db psql -U postgres -d fineract_default >/dev/null <<'SQL'
UPDATE c_external_service_properties SET value = 'mailpit'
  WHERE name = 'host' AND external_service_id = (SELECT id FROM c_external_service WHERE name = 'SMTP_Email_Account');
UPDATE c_external_service_properties SET value = '1025'
  WHERE name = 'port' AND external_service_id = (SELECT id FROM c_external_service WHERE name = 'SMTP_Email_Account');
UPDATE c_external_service_properties SET value = 'false'
  WHERE name = 'useTLS' AND external_service_id = (SELECT id FROM c_external_service WHERE name = 'SMTP_Email_Account');
SQL
echo "✅ Two-factor stack is up."
