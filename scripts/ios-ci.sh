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
# Each failing stage writes what it needs to be diagnosed to $DIAG (a file per stage); the
# workflow's next step posts those as check annotations (scripts/lib/annotate.sh). Each stage that
# passes posts a notice, so the annotations also say how far the run got.
set -uo pipefail

APP_ID=io.github.amanmittal.mfibackoffice
DIAG=${DIAG:-${RUNNER_TEMP:-/tmp}/ios-diagnostics}
mkdir -p "$DIAG"
build=$(mktemp)
flows=$(mktemp)

npx expo run:ios --configuration Release --no-bundler 2>&1 | tee "$build"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  {
    echo "expo run:ios exited $status"
    xcodebuild -version
    xcrun simctl list devices booted
    echo '...'
    grep -E 'error|Error|failed' "$build" | tail -n 30
    echo '...'
    tail -n 30 "$build"
  } >"$DIAG/iOS build failed.txt"
  exit 1
fi
echo '::notice title=iOS stage::the release build is installed on the simulator'

curl -fsSL "https://get.maestro.mobile.dev" | bash
"$HOME/.maestro/bin/maestro" test e2e/native --exclude-tags=pending -e APP_ID="$APP_ID" 2>&1 | tee "$flows"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  { echo "maestro exited $status"; tail -n 40 "$flows"; } >"$DIAG/Maestro flows failed on iOS.txt"
fi
exit "$status"
