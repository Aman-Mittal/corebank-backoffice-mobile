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

# Nightly iOS: builds the release app onto a simulator, then runs the non-pending Maestro flows.
#
#   scripts/ios-ci.sh
#
# Each failing stage posts the end of its output as a check annotation (scripts/lib/annotate.sh).
set -uo pipefail

# shellcheck source=lib/annotate.sh
source "$(dirname "$0")/lib/annotate.sh"

APP_ID=io.github.amanmittal.mfibackoffice
build=$(mktemp)
flows=$(mktemp)

npx expo run:ios --configuration Release --no-bundler 2>&1 | tee "$build"
if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  { xcodebuild -version; xcrun simctl list devices booted; echo '...'; grep -E 'error|Error|failed' "$build" | tail -n 30; echo '...'; tail -n 30 "$build"; } |
    annotate 'iOS build failed'
  exit 1
fi

curl -fsSL "https://get.maestro.mobile.dev" | bash
"$HOME/.maestro/bin/maestro" test e2e/native --exclude-tags=pending -e APP_ID="$APP_ID" 2>&1 | tee "$flows"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  tail -n 40 "$flows" | annotate 'Maestro flows failed on iOS'
fi
exit "$status"
