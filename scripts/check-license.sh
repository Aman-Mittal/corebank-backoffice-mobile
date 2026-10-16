#!/bin/bash
#
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

# Every hand-written source file carries an Apache-2.0 header. Two forms are accepted:
#
#   - this project's own header (scripts/license-header.txt), for files written here;
#   - the ASF contributor header, for files carried over from fineract-backoffice-ui, which must
#     keep the notice they were licensed under (Apache-2.0 §4(c)). See NOTICE.
#
# A header is checked for its grant, its URL and its "AS IS" clause, not just its first line: a
# spliced header that keeps the opening phrase but loses the grant would otherwise pass.

set -u
cd "$(dirname "$0")/.." || exit 1

FILES=$(find src e2e scripts eslint-rules deploy .github -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" -o -name "*.mts" -o -name "*.yml" -o -name "*.yaml" -o -name "*.sh" \) \
  -not -path "src/api/generated/*" 2>/dev/null)
FILES="$FILES $(ls ./*.js ./*.ts ./*.mts 2>/dev/null)"

MISSING=0
for FILE in $FILES; do
  [ -f "$FILE" ] || continue
  if ! grep -q -E "Copyright [0-9]{4} |Licensed to the Apache Software Foundation" "$FILE"; then
    echo "Missing license header: $FILE"; MISSING=$((MISSING + 1))
  elif ! grep -q -E "Licensed under the Apache License, Version 2.0|under the Apache License, Version 2.0" "$FILE"; then
    echo "Incomplete license header (no Apache-2.0 grant): $FILE"; MISSING=$((MISSING + 1))
  elif ! grep -q "http://www.apache.org/licenses/LICENSE-2.0" "$FILE"; then
    echo "Incomplete license header (no licence URL): $FILE"; MISSING=$((MISSING + 1))
  elif ! grep -q "\"AS IS\" BASIS" "$FILE"; then
    echo "Incomplete license header (no \"AS IS\" clause): $FILE"; MISSING=$((MISSING + 1))
  fi
done

for REQUIRED in LICENSE NOTICE DISCLAIMER.md; do
  if [ ! -f "$REQUIRED" ]; then
    echo "Required file missing from the repository root: $REQUIRED"; MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo "Found $MISSING problem(s) with license headers or required files."
  exit 1
fi
echo "All checked files have license headers; LICENSE, NOTICE and DISCLAIMER.md are present."
