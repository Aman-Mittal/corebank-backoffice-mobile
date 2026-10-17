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

# Sourced by the CI scripts. Job logs need admin rights to read; check annotations do not, so a
# failing step posts what it needs to be diagnosed as an annotation.

# Prints stdin as one error annotation titled $1: colour codes stripped, escaped as workflow
# commands require, lines joined with %0A. The title must not contain ':' or ','.
annotate() {
  sed -e 's/\x1b\[[0-9;]*[A-Za-z]//g' -e 's/%/%25/g' -e 's/\r/%0D/g' |
    awk -v title="$1" 'BEGIN { printf "::error title=%s::", title } { printf "%s%%0A", $0 } END { print "" }'
}
