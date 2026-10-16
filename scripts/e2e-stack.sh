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

# Brings the local backend stack up and waits until it answers. Adapted from fineract-backoffice-ui.
#
#   scripts/e2e-stack.sh          # start, keeping existing data
#   scripts/e2e-stack.sh --fresh  # destroy the volume first (what CI does every run)
#   scripts/e2e-stack.sh --down   # stop and free the memory
#
# The backend needs about 1 GB. Refuses to start when the host has less than MBO_MIN_FREE_MB
# available, rather than pushing a shared machine into swap (DOCS/E2E.md, "Resource limits").

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f deploy/docker-compose-e2e.yml)
HEALTH_URL="https://localhost:${MBO_E2E_API_PORT:-8443}/fineract-provider/actuator/info"
MIN_FREE_MB="${MBO_MIN_FREE_MB:-2048}"

if [[ "${1:-}" == "--down" ]]; then
  "${COMPOSE[@]}" down
  exit 0
fi

if command -v free >/dev/null; then
  AVAILABLE_MB=$(free -m | awk 'NR==2 {print $7}')
  if (( AVAILABLE_MB < MIN_FREE_MB )); then
    echo "❌ Only ${AVAILABLE_MB} MB available; the stack needs ~${MIN_FREE_MB} MB. Free memory or set MBO_MIN_FREE_MB."
    exit 1
  fi
fi

if [[ "${1:-}" == "--fresh" ]]; then
  echo "🧹 Removing the existing database volume..."
  "${COMPOSE[@]}" down -v
fi

echo "🐘 Starting PostgreSQL..."
"${COMPOSE[@]}" up -d --wait db

echo "📦 Ensuring the databases exist (idempotent)..."
docker exec -i mbo-e2e-db psql -U postgres < deploy/init-db.sql

echo "🚀 Starting the backend..."
"${COMPOSE[@]}" up -d backend

echo "⏳ Waiting for the backend (migrations take 60-90s on a fresh volume)..."
for _ in {1..72}; do
  if [[ "$(curl -k -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || true)" == "200" ]]; then
    echo "✅ Backend is up. Run: npm run e2e:web -- --project=setup --project=backend"
    exit 0
  fi
  sleep 5
done

echo "❌ The backend did not come up in time. Recent logs:"
"${COMPOSE[@]}" logs --tail=50 backend
exit 1
