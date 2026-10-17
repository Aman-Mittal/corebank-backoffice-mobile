// Copyright 2026 Aman Mittal
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { withAndroidManifest } = require('expo/config-plugins');

/**
 * For the Android e2e build only (`MBO_E2E_CLEARTEXT=1`): allows plain HTTP, so the emulator can
 * reach the e2e stack through `adb reverse` and a local HTTP-to-HTTPS relay. The stack's
 * certificate is self-signed, which a release build rightly refuses. Every other build is
 * unchanged: Android's default, HTTPS only.
 */
module.exports = function withE2eCleartext(config) {
  if (process.env.MBO_E2E_CLEARTEXT !== '1') return config;
  return withAndroidManifest(config, (mod) => {
    mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    return mod;
  });
};
