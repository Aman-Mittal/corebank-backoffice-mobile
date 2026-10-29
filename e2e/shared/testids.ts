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
  profile: {
    screen: 'profile.screen',
    username: 'profile.username',
    displayName: 'profile.display-name',
    office: 'profile.office',
    email: 'profile.email',
    roles: 'profile.roles',
    changePassword: 'profile.change-password',
    newPassword: 'profile.new-password',
    repeatPassword: 'profile.repeat-password',
    mismatch: 'profile.password-mismatch',
    policy: 'profile.password-policy',
    submit: 'profile.password-submit',
    cancel: 'profile.password-cancel',
    error: 'profile.password-error',
    /** "Password changed", after a successful change. */
    notice: 'profile.notice',
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
  /** Loading, failure and empty states shared by every data screen. */
  state: {
    loading: 'state.loading',
    error: 'state.error',
    retry: 'state.retry',
    empty: 'state.empty',
    notFound: 'state.not-found',
    back: 'state.back',
  },
  offices: {
    screen: 'offices.screen',
    search: 'offices.search',
    create: 'offices.create',
    /** One per office: `offices.row.2`. */
    row: (id: number | string) => `offices.row.${id}`,
  },
  office: {
    screen: 'office.screen',
    name: 'office.name',
    parent: 'office.parent',
    openingDate: 'office.opening-date',
    externalId: 'office.external-id',
    edit: 'office.edit',
  },
  officeForm: {
    screen: 'office-form.screen',
    name: 'office-form.name',
    parent: 'office-form.parent',
    openingDate: 'office-form.opening-date',
    externalId: 'office-form.external-id',
    submit: 'office-form.submit',
    error: 'office-form.error',
  },
  staff: {
    screen: 'staff.screen',
    search: 'staff.search',
    officeFilter: 'staff.office-filter',
    create: 'staff.create',
    /** One per staff member: `staff.row.2`. */
    row: (id: number | string) => `staff.row.${id}`,
  },
  staffMember: {
    screen: 'staff-member.screen',
    name: 'staff-member.name',
    office: 'staff-member.office',
    mobile: 'staff-member.mobile',
    email: 'staff-member.email',
    externalId: 'staff-member.external-id',
    joiningDate: 'staff-member.joining-date',
    loanOfficer: 'staff-member.loan-officer',
    status: 'staff-member.status',
    edit: 'staff-member.edit',
  },
  staffForm: {
    screen: 'staff-form.screen',
    office: 'staff-form.office',
    firstname: 'staff-form.firstname',
    lastname: 'staff-form.lastname',
    mobile: 'staff-form.mobile',
    email: 'staff-form.email',
    externalId: 'staff-form.external-id',
    joiningDate: 'staff-form.joining-date',
    loanOfficer: 'staff-form.loan-officer',
    active: 'staff-form.active',
    submit: 'staff-form.submit',
    error: 'staff-form.error',
  },
  clients: {
    screen: 'clients.screen',
    search: 'clients.search',
    create: 'clients.create',
    /** "1–20 of 45". */
    range: 'clients.range',
    first: 'clients.first',
    previous: 'clients.previous',
    next: 'clients.next',
    last: 'clients.last',
    /** One per client: `clients.row.2`. */
    row: (id: number | string) => `clients.row.${id}`,
  },
  client: {
    screen: 'client.screen',
    name: 'client.name',
    accountNo: 'client.account-no',
    status: 'client.status',
    office: 'client.office',
    legalForm: 'client.legal-form',
    externalId: 'client.external-id',
    mobile: 'client.mobile',
    email: 'client.email',
    submittedOn: 'client.submitted-on',
    activationDate: 'client.activation-date',
    closedOn: 'client.closed-on',
    /** The button that opens a lifecycle command's panel: `client.action.reject`. */
    action: (command: string) => `client.action.${command}`,
    actionDate: 'client.action-date',
    actionReason: 'client.action-reason',
    actionNoReasons: 'client.action-no-reasons',
    actionConfirm: 'client.action-confirm',
    actionCancel: 'client.action-cancel',
    actionError: 'client.action-error',
    identifiersLink: 'client.identifiers-link',
    notesLink: 'client.notes-link',
    staff: 'client.staff',
    assignStaff: 'client.assign-staff',
    unassignStaff: 'client.unassign-staff',
    staffSelect: 'client.staff-select',
    staffNone: 'client.staff-none',
    staffConfirm: 'client.staff-confirm',
    staffCancel: 'client.staff-cancel',
    unassignConfirm: 'client.unassign-confirm',
    unassignCancel: 'client.unassign-cancel',
    staffError: 'client.staff-error',
  },
  identifiers: {
    screen: 'identifiers.screen',
    back: 'identifiers.back',
    add: 'identifiers.add',
    /** One per identifier: `identifiers.row.2`. */
    row: (id: number | string) => `identifiers.row.${id}`,
    remove: (id: number | string) => `identifiers.remove.${id}`,
    confirmRemove: 'identifiers.confirm-remove',
    cancelRemove: 'identifiers.cancel-remove',
  },
  identifierForm: {
    type: 'identifier-form.type',
    key: 'identifier-form.key',
    description: 'identifier-form.description',
    submit: 'identifier-form.submit',
    cancel: 'identifier-form.cancel',
    error: 'identifier-form.error',
  },
  notes: {
    screen: 'notes.screen',
    back: 'notes.back',
    text: 'notes.text',
    add: 'notes.add',
    error: 'notes.error',
    /** One per note: `notes.row.2`. */
    row: (id: number | string) => `notes.row.${id}`,
    edit: (id: number | string) => `notes.edit.${id}`,
    remove: (id: number | string) => `notes.remove.${id}`,
    editText: 'notes.edit-text',
    save: 'notes.save',
    cancelEdit: 'notes.cancel-edit',
    confirmRemove: 'notes.confirm-remove',
    cancelRemove: 'notes.cancel-remove',
  },
  clientForm: {
    screen: 'client-form.screen',
    legalForm: 'client-form.legal-form',
    office: 'client-form.office',
    firstname: 'client-form.firstname',
    middlename: 'client-form.middlename',
    lastname: 'client-form.lastname',
    fullname: 'client-form.fullname',
    submittedOn: 'client-form.submitted-on',
    active: 'client-form.active',
    activationDate: 'client-form.activation-date',
    externalId: 'client-form.external-id',
    mobile: 'client-form.mobile',
    email: 'client-form.email',
    submit: 'client-form.submit',
    error: 'client-form.error',
  },
  /** An option of a select field: `office-form.parent.option.2`. */
  option: (field: string, value: number | string) => `${field}.option.${value}`,
  /** The message under a form field: `office-form.name.error`. */
  fieldError: (field: string) => `${field}.error`,
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
