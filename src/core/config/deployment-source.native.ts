/*
 * Copyright 2026 Aman Mittal
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Native: build-time variables, inlined by Expo. */
export async function readDeploymentSource(): Promise<unknown> {
  return {
    oidc: process.env.EXPO_PUBLIC_OIDC_ISSUER
      ? {
          issuer: process.env.EXPO_PUBLIC_OIDC_ISSUER,
          clientId: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID,
          scopes: process.env.EXPO_PUBLIC_OIDC_SCOPES,
          label: process.env.EXPO_PUBLIC_OIDC_LABEL,
        }
      : null,
    rbacEnabled: process.env.EXPO_PUBLIC_RBAC_ENABLED,
  };
}
