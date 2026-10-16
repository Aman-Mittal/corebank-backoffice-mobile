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

/**
 * Every testID the e2e suites select by, declared once and imported by both the app and the tests.
 *
 * Shape: `<screen>.<element>[.<qualifier>]`. On web react-native-web renders `testID` as
 * `data-testid` (Playwright's `getByTestId`); on native Maestro selects it with `id:`.
 * `scripts/check-testids.mjs` fails on an id used in a spec or flow that is not declared here.
 */
export const TID = {
  login: {
    screen: 'login.screen',
    server: 'login.server',
    tenant: 'login.tenant',
    username: 'login.username',
    password: 'login.password',
    submit: 'login.submit',
    error: 'login.error',
    notice: 'login.notice',
    aboutLink: 'login.about-link',
    oidc: 'login.oidc',
  },
  twoFactor: {
    screen: 'two-factor.screen',
    /** One per delivery channel: `two-factor.method.email`. */
    method: (name: string) => `two-factor.method.${name}`,
    target: 'two-factor.target',
    send: 'two-factor.send',
    code: 'two-factor.code',
    verify: 'two-factor.verify',
    error: 'two-factor.error',
    noMethods: 'two-factor.no-methods',
    back: 'two-factor.back',
  },
  home: {
    screen: 'home.screen',
    welcome: 'home.welcome',
    office: 'home.office',
  },
  shell: {
    signOut: 'shell.sign-out',
    menuButton: 'shell.menu-button',
    drawer: 'shell.drawer',
    drawerClose: 'shell.drawer-close',
    backdrop: 'shell.backdrop',
    sidebar: 'shell.sidebar',
    /** One per catalogue entry or group: `nav.item.clients`, `nav.group.security`. */
    navItem: (id: string) => `nav.item.${id}`,
    navGroup: (id: string) => `nav.group.${id}`,
  },
  accessDenied: {
    screen: 'access-denied.screen',
    heading: 'access-denied.heading',
    required: 'access-denied.required',
    home: 'access-denied.home',
  },
  placeholder: {
    screen: 'placeholder.screen',
    title: 'placeholder.title',
    phase: 'placeholder.phase',
  },
  about: {
    screen: 'about.screen',
    disclaimer: 'about.disclaimer',
    version: 'about.version',
    license: 'about.license',
  },
} as const;

/** Flattened, for the check script and for Maestro flow authors. */
export function allTestIds(): string[] {
  const out: string[] = [];
  const walk = (o: object) => {
    for (const v of Object.values(o)) {
      if (typeof v === 'string') out.push(v);
      else if (typeof v === 'object') walk(v as object);
    }
  };
  walk(TID);
  return out;
}
