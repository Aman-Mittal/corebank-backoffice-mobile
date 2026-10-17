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
# commands require, lines joined with %0A. The title must not contain ':' or ','. Perl rather than
# sed, which differs on macOS (BSD sed reads `\r` as a plain `r`), and capped well under the 64 KB
# an annotation may hold.
annotate() {
  perl -e '
    local $/; my $s = <STDIN> // "";
    $s =~ s/\e\[[0-9;?]*[A-Za-z]//g; $s =~ s/[^\n\t\x20-\x7e]//g;
    $s = substr($s, -12000) if length($s) > 12000;
    $s =~ s/%/%25/g; $s =~ s/\n/%0A/g;
    print "::error title=$ARGV[0]::$s\n";
  ' "$1"
}
