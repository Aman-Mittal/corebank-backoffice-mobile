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

# Installs the app and runs the non-pending Maestro flows on CI.
#
#   scripts/maestro-ci.sh <app.apk>
#
# A failure's last output lines become a check annotation: job logs need admin rights to read,
# annotations do not. It is a script rather than inline `script:` because the emulator runner
# executes each line of that on its own.
set -uo pipefail

APP_ID=io.github.amanmittal.mfibackoffice
app=$1
out=$(mktemp)

adb install "$app" || exit 1

# shellcheck source=lib/annotate.sh
source "$(dirname "$0")/lib/annotate.sh"

adb logcat -c
maestro test e2e/native --exclude-tags=pending -e APP_ID="$APP_ID" 2>&1 | tee "$out"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  tail -n 40 "$out" | annotate 'Maestro flows failed'
  # Why the app did not show what the flow expected: crashes and JS errors.
  adb logcat -d -s 'ReactNativeJS:*' 'AndroidRuntime:E' 'ReactNative:E' '*:F' | tail -n 60 |
    annotate 'App log - crashes and JS errors'
  # What is on screen now: each view's resource id and text.
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb shell cat /sdcard/ui.xml | grep -o -E '(resource-id|text|content-desc)="[^"]+"' | head -n 60 |
    annotate 'Screen at the end of the run'
fi
exit "$status"
