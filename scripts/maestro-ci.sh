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

maestro test e2e/native --exclude-tags=pending -e APP_ID="$APP_ID" 2>&1 | tee "$out"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  # One annotation: strip colour codes, escape as workflow commands require, join with %0A.
  tail -n 40 "$out" |
    sed -e 's/\x1b\[[0-9;]*[A-Za-z]//g' -e 's/%/%25/g' -e 's/\r/%0D/g' |
    awk 'BEGIN { printf "::error title=Maestro flows failed::" } { printf "%s%%0A", $0 } END { print "" }'
fi
exit "$status"
