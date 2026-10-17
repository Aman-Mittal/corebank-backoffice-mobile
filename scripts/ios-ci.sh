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

# Expo SDK 57 needs Xcode 26.4 or newer (docs.expo.dev/versions/v57.0.0); the runner's default
# Xcode may be older, so the newest installed one is selected.
xcode=$(ls -d /Applications/Xcode_26*.app 2>/dev/null | sort -V | tail -n 1)
if [ -n "$xcode" ]; then sudo xcode-select -s "$xcode"; fi
echo "::notice title=iOS stage::building with $(xcodebuild -version | tr '\n' ' ')"

npx expo run:ios --configuration Release --no-bundler 2>&1 | tee "$build"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  {
    echo "expo run:ios exited $status"
    xcodebuild -version
    xcrun simctl list devices booted
    echo '...'
    # The reason follows the first error line; the dependency listing after it can run to pages.
    grep -m 3 -A 12 -E 'error:|Error:' "$build"
    echo '...'
    tail -n 15 "$build"
  } >"$DIAG/iOS build failed.txt"
  exit 1
fi
echo '::notice title=iOS stage::the release build is installed on the simulator'

curl -fsSL "https://get.maestro.mobile.dev" | bash
# Only the flows that need no backend: the macOS runner has no docker for the e2e stack.
"$HOME/.maestro/bin/maestro" test e2e/native --exclude-tags=pending,backend -e APP_ID="$APP_ID" 2>&1 | tee "$flows"
status=${PIPESTATUS[0]}
if [ "$status" -ne 0 ]; then
  { echo "maestro exited $status"; tail -n 40 "$flows"; } >"$DIAG/Maestro flows failed on iOS.txt"
  # What is on screen now (the failed flow leaves the app where it stopped): each element's id
  # and text, from Maestro's view hierarchy.
  "$HOME/.maestro/bin/maestro" hierarchy 2>/dev/null |
    python3 -c '
import json, sys
seen = []
def walk(node):
    attrs = node.get("attributes", {})
    parts = [attrs.get(k) for k in ("resource-id", "text", "accessibilityText", "title")]
    line = " | ".join(p for p in parts if p)
    if line and line not in seen:
        seen.append(line)
    for child in node.get("children", []):
        walk(child)
try:
    walk(json.load(sys.stdin))
except ValueError:
    print("no hierarchy")
print("\n".join(seen[:80]))
' >"$DIAG/Screen at the end of the iOS run.txt"
fi
exit "$status"
