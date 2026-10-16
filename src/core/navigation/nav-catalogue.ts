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

import type { Access } from '@/core/auth/permissions';

/**
 * Every backoffice module, in navigation order, with the permission its route requires.
 *
 * Ported from fineract-backoffice-ui's `NAV_CONFIG` (Apache-2.0), which is the parity reference;
 * labels are this app's i18n keys. `phase` is the delivery phase that builds the module's screens
 * (see the plan); until then its route opens a guarded placeholder that says so.
 *
 * `access: null` means the reference does not gate the entry. Those are kept ungated for parity
 * and are to be confirmed against the backend's permission catalogue (`GET /permissions`) when
 * their module is built: Share Products, Interest Rate Charts, Collateral Management, Share
 * Accounts, SPM Surveys / Poverty Line / Survey Responses, Asset Owners, Provisioning, Tellers,
 * Group Levels, and five System entries.
 *
 * Two reference entries are not here: the second `/admin/wc-cob-tools` (listed under both Working
 * Capital and Admin; routes are unique here) and Forgot Password, which is a signed-out screen.
 */
export interface NavEntry {
  readonly id: string;
  readonly labelKey: string;
  readonly route: `/${string}`;
  readonly access: Access | null;
  readonly phase: number;
}

export interface NavGroup {
  readonly id: string;
  readonly labelKey: string;
  readonly children: readonly NavEntry[];
}

export type NavNode = NavEntry | NavGroup;

export const isGroup = (node: NavNode): node is NavGroup => 'children' in node;

export const NAV_CATALOGUE: readonly NavNode[] = [
  { id: 'dashboard', labelKey: 'NAV.DASHBOARD', route: '/home', access: null, phase: 1 },
  {
    id: 'notifications',
    labelKey: 'NAV.NOTIFICATIONS',
    route: '/notifications',
    access: null,
    phase: 1,
  },
  { id: 'search', labelKey: 'NAV.SEARCH', route: '/search', access: null, phase: 1 },
  { id: 'profile', labelKey: 'NAV.PROFILE', route: '/profile', access: null, phase: 1 },
  {
    id: 'clients',
    labelKey: 'NAV.CLIENTS',
    route: '/clients',
    access: { anyOf: ['READ_CLIENT'] },
    phase: 1,
  },
  {
    id: 'groups',
    labelKey: 'NAV.GROUPS',
    route: '/groups',
    access: { anyOf: ['READ_GROUP'] },
    phase: 2,
  },
  {
    id: 'centers',
    labelKey: 'NAV.CENTERS',
    route: '/centers',
    access: { anyOf: ['READ_CENTER'] },
    phase: 2,
  },
  {
    id: 'collection-sheet',
    labelKey: 'NAV.COLLECTION_SHEET',
    route: '/collection-sheet',
    access: { anyOf: ['READ_COLLECTIONSHEET'] },
    phase: 2,
  },
  {
    id: 'loans',
    labelKey: 'NAV.LOANS',
    route: '/loans',
    access: { anyOf: ['READ_LOAN'] },
    phase: 3,
  },
  {
    id: 'loans.bulk-reassignment',
    labelKey: 'NAV.LOANS_BULK_REASSIGNMENT',
    route: '/loans/bulk-reassignment',
    access: { anyOf: ['BULKREASSIGN_LOAN'] },
    phase: 3,
  },
  {
    id: 'loans.point-in-time',
    labelKey: 'NAV.LOANS_POINT_IN_TIME',
    route: '/loans/point-in-time',
    access: { anyOf: ['READ_LOAN'] },
    phase: 3,
  },
  {
    id: 'loans.account-locks',
    labelKey: 'NAV.LOANS_ACCOUNT_LOCKS',
    route: '/loans/account-locks',
    access: { anyOf: ['READ_LOAN'] },
    phase: 3,
  },
  {
    id: 'loans.cob-catchup',
    labelKey: 'NAV.LOANS_COB_CATCHUP',
    route: '/loans/cob-catchup',
    access: { anyOf: ['EXECUTEJOB_SCHEDULER'] },
    phase: 3,
  },
  {
    id: 'loans.schedule-modify',
    labelKey: 'NAV.LOANS_SCHEDULE_MODIFY',
    route: '/loans/schedule-modify',
    access: { anyOf: ['UPDATE_LOAN'] },
    phase: 3,
  },
  {
    id: 'transfers',
    labelKey: 'NAV.TRANSFERS',
    children: [
      {
        id: 'transfers.account-transfer',
        labelKey: 'NAV.TRANSFERS_ACCOUNT_TRANSFER',
        route: '/transfers/account-transfer',
        access: { anyOf: ['CREATE_ACCOUNTTRANSFER'] },
        phase: 6,
      },
      {
        id: 'transfers.standing-instructions',
        labelKey: 'NAV.TRANSFERS_STANDING_INSTRUCTIONS',
        route: '/transfers/standing-instructions',
        access: { anyOf: ['READ_STANDINGINSTRUCTION'] },
        phase: 6,
      },
      {
        id: 'transfers.standing-instructions-history',
        labelKey: 'NAV.TRANSFERS_STANDING_INSTRUCTIONS_HISTORY',
        route: '/transfers/standing-instructions/history',
        access: { anyOf: ['READ_STANDINGINSTRUCTION'] },
        phase: 6,
      },
      {
        id: 'transfers.history',
        labelKey: 'NAV.TRANSFERS_HISTORY',
        route: '/transfers/history',
        access: { anyOf: ['READ_ACCOUNTTRANSFER'] },
        phase: 6,
      },
    ],
  },
  {
    id: 'products',
    labelKey: 'NAV.PRODUCTS',
    children: [
      {
        id: 'products.loan',
        labelKey: 'NAV.PRODUCTS_LOAN',
        route: '/products/loan',
        access: { anyOf: ['READ_LOANPRODUCT'] },
        phase: 5,
      },
      {
        id: 'products.savings',
        labelKey: 'NAV.PRODUCTS_SAVINGS',
        route: '/products/savings',
        access: { anyOf: ['READ_SAVINGSPRODUCT'] },
        phase: 5,
      },
      {
        id: 'products.fixed',
        labelKey: 'NAV.PRODUCTS_FIXED',
        route: '/products/fixed',
        access: { anyOf: ['READ_FIXEDDEPOSITPRODUCT'] },
        phase: 5,
      },
      {
        id: 'products.recurring',
        labelKey: 'NAV.PRODUCTS_RECURRING',
        route: '/products/recurring',
        access: { anyOf: ['READ_RECURRINGDEPOSITPRODUCT'] },
        phase: 5,
      },
      {
        id: 'products.share',
        labelKey: 'NAV.PRODUCTS_SHARE',
        route: '/products/share',
        access: null,
        phase: 5,
      },
      {
        id: 'products.tax-components',
        labelKey: 'NAV.PRODUCTS_TAX_COMPONENTS',
        route: '/products/tax-components',
        access: { anyOf: ['READ_TAXCOMPONENT'] },
        phase: 5,
      },
      {
        id: 'products.tax-groups',
        labelKey: 'NAV.PRODUCTS_TAX_GROUPS',
        route: '/products/tax-groups',
        access: { anyOf: ['READ_TAXGROUP'] },
        phase: 5,
      },
      {
        id: 'products.floating-rates',
        labelKey: 'NAV.PRODUCTS_FLOATING_RATES',
        route: '/products/floating-rates',
        access: { anyOf: ['READ_FLOATINGRATE'] },
        phase: 5,
      },
      {
        id: 'products.rates',
        labelKey: 'NAV.PRODUCTS_RATES',
        route: '/products/rates',
        access: { anyOf: ['READ_RATE'] },
        phase: 5,
      },
      {
        id: 'products.interest-rate-charts',
        labelKey: 'NAV.PRODUCTS_INTEREST_RATE_CHARTS',
        route: '/products/interest-rate-charts',
        access: null,
        phase: 5,
      },
      {
        id: 'products.loan-originators',
        labelKey: 'NAV.PRODUCTS_LOAN_ORIGINATORS',
        route: '/products/loan-originators',
        access: { anyOf: ['READ_LOAN_ORIGINATOR'] },
        phase: 5,
      },
      {
        id: 'products.collateral-management',
        labelKey: 'NAV.PRODUCTS_COLLATERAL_MANAGEMENT',
        route: '/products/collateral-management',
        access: null,
        phase: 5,
      },
      {
        id: 'products.savings-accounts',
        labelKey: 'NAV.PRODUCTS_SAVINGS_ACCOUNTS',
        route: '/products/savings-accounts',
        access: { anyOf: ['READ_SAVINGSACCOUNT'] },
        phase: 4,
      },
      {
        id: 'products.fixed-deposits',
        labelKey: 'NAV.PRODUCTS_FIXED_DEPOSITS',
        route: '/products/fixed-deposits',
        access: { anyOf: ['READ_FIXEDDEPOSITACCOUNT'] },
        phase: 4,
      },
      {
        id: 'products.recurring-deposits',
        labelKey: 'NAV.PRODUCTS_RECURRING_DEPOSITS',
        route: '/products/recurring-deposits',
        access: { anyOf: ['READ_RECURRINGDEPOSITACCOUNT'] },
        phase: 4,
      },
      {
        id: 'products.shares',
        labelKey: 'NAV.PRODUCTS_SHARES',
        route: '/products/shares',
        access: null,
        phase: 4,
      },
    ],
  },
  {
    id: 'working-capital',
    labelKey: 'NAV.WORKING_CAPITAL',
    children: [
      {
        id: 'working-capital.loans',
        labelKey: 'NAV.WORKING_CAPITAL_LOANS',
        route: '/working-capital/loans',
        access: { anyOf: ['READ_WORKINGCAPITALLOAN'] },
        phase: 9,
      },
      {
        id: 'working-capital.loan-products',
        labelKey: 'NAV.WORKING_CAPITAL_LOAN_PRODUCTS',
        route: '/working-capital/loan-products',
        access: { anyOf: ['READ_WORKINGCAPITALLOANPRODUCT'] },
        phase: 9,
      },
      {
        id: 'working-capital.breach',
        labelKey: 'NAV.WORKING_CAPITAL_BREACH',
        route: '/working-capital/breach',
        access: { anyOf: ['READ_WORKINGCAPITALBREACH'] },
        phase: 9,
      },
      {
        id: 'working-capital.near-breach',
        labelKey: 'NAV.WORKING_CAPITAL_NEAR_BREACH',
        route: '/working-capital/near-breach',
        access: { anyOf: ['READ_WORKINGCAPITALNEARBREACH'] },
        phase: 9,
      },
      {
        id: 'working-capital.account-locks',
        labelKey: 'NAV.WORKING_CAPITAL_ACCOUNT_LOCKS',
        route: '/working-capital/loans/account-locks',
        access: { anyOf: ['READ_WORKINGCAPITALLOAN'] },
        phase: 9,
      },
      {
        id: 'working-capital.cob-catchup',
        labelKey: 'NAV.WORKING_CAPITAL_COB_CATCHUP',
        route: '/working-capital/loans/cob-catchup',
        access: { anyOf: ['EXECUTEJOB_SCHEDULER'] },
        phase: 9,
      },
    ],
  },
  {
    id: 'spm',
    labelKey: 'NAV.SPM',
    children: [
      {
        id: 'spm.surveys',
        labelKey: 'NAV.SPM_SURVEYS',
        route: '/spm/surveys',
        access: null,
        phase: 9,
      },
      {
        id: 'spm.poverty-line',
        labelKey: 'NAV.SPM_POVERTY_LINE',
        route: '/spm/poverty-line',
        access: null,
        phase: 9,
      },
      {
        id: 'spm.likelihood',
        labelKey: 'NAV.SPM_LIKELIHOOD',
        route: '/spm/likelihood',
        access: { anyOf: ['UPDATE_LIKELIHOOD'] },
        phase: 9,
      },
      {
        id: 'spm.survey-responses',
        labelKey: 'NAV.SPM_SURVEY_RESPONSES',
        route: '/spm/survey-responses',
        access: null,
        phase: 9,
      },
    ],
  },
  {
    id: 'campaigns',
    labelKey: 'NAV.CAMPAIGNS',
    children: [
      {
        id: 'campaigns.email',
        labelKey: 'NAV.CAMPAIGNS_EMAIL',
        route: '/campaigns/email',
        access: { anyOf: ['READ_EMAIL_CAMPAIGN'] },
        phase: 9,
      },
      {
        id: 'campaigns.sms',
        labelKey: 'NAV.CAMPAIGNS_SMS',
        route: '/campaigns/sms',
        access: { anyOf: ['READ_SMSCAMPAIGN'] },
        phase: 9,
      },
      {
        id: 'campaigns.email-messages',
        labelKey: 'NAV.CAMPAIGNS_EMAIL_MESSAGES',
        route: '/campaigns/email-messages',
        access: { anyOf: ['READ_EMAIL_CAMPAIGN'] },
        phase: 9,
      },
    ],
  },
  {
    id: 'interop',
    labelKey: 'NAV.INTEROP',
    children: [
      {
        id: 'interop.parties',
        labelKey: 'NAV.INTEROP_PARTIES',
        route: '/interop/parties',
        access: { anyOf: ['READ_INTERID'] },
        phase: 9,
      },
      {
        id: 'interop.accounts',
        labelKey: 'NAV.INTEROP_ACCOUNTS',
        route: '/interop/accounts',
        access: { anyOf: ['READ_INTERID'] },
        phase: 9,
      },
      {
        id: 'interop.quotes',
        labelKey: 'NAV.INTEROP_QUOTES',
        route: '/interop/quotes',
        access: { anyOf: ['READ_INTERQUOTE'] },
        phase: 9,
      },
      {
        id: 'interop.transfers',
        labelKey: 'NAV.INTEROP_TRANSFERS',
        route: '/interop/transfers',
        access: { anyOf: ['READ_INTERTRANSFER'] },
        phase: 9,
      },
      {
        id: 'interop.health',
        labelKey: 'NAV.INTEROP_HEALTH',
        route: '/interop/health',
        access: { anyOf: ['READ_INTERID'] },
        phase: 9,
      },
    ],
  },
  {
    id: 'admin',
    labelKey: 'NAV.ADMIN',
    children: [
      {
        id: 'admin.batch-operations',
        labelKey: 'NAV.ADMIN_BATCH_OPERATIONS',
        route: '/admin/batch-operations',
        access: { anyOf: ['ALL_FUNCTIONS'] },
        phase: 8,
      },
      {
        id: 'admin.inline-job',
        labelKey: 'NAV.ADMIN_INLINE_JOB',
        route: '/admin/inline-job',
        access: { anyOf: ['EXECUTEJOB_SCHEDULER'] },
        phase: 8,
      },
      {
        id: 'admin.cob-tools',
        labelKey: 'NAV.ADMIN_COB_TOOLS',
        route: '/admin/cob-tools',
        access: { anyOf: ['EXECUTEJOB_SCHEDULER'] },
        phase: 8,
      },
      {
        id: 'admin.wc-cob-tools',
        labelKey: 'NAV.ADMIN_WC_COB_TOOLS',
        route: '/admin/wc-cob-tools',
        access: { anyOf: ['EXECUTEJOB_SCHEDULER'] },
        phase: 8,
      },
      {
        id: 'admin.external-events',
        labelKey: 'NAV.ADMIN_EXTERNAL_EVENTS',
        route: '/admin/external-events',
        access: { anyOf: ['READ_EXTERNAL_EVENT_CONFIGURATION'] },
        phase: 8,
      },
      {
        id: 'admin.progressive-loan',
        labelKey: 'NAV.ADMIN_PROGRESSIVE_LOAN',
        route: '/admin/progressive-loan',
        access: { anyOf: ['READ_LOANPRODUCT'] },
        phase: 8,
      },
    ],
  },
  {
    id: 'fintech',
    labelKey: 'NAV.FINTECH',
    children: [
      {
        id: 'fintech.asset-owners',
        labelKey: 'NAV.FINTECH_ASSET_OWNERS',
        route: '/fintech/asset-owners',
        access: null,
        phase: 9,
      },
    ],
  },
  {
    id: 'accounting',
    labelKey: 'NAV.ACCOUNTING',
    children: [
      {
        id: 'accounting.chart-of-accounts',
        labelKey: 'NAV.ACCOUNTING_CHART_OF_ACCOUNTS',
        route: '/accounting/chart-of-accounts',
        access: { anyOf: ['READ_GLACCOUNT'] },
        phase: 6,
      },
      {
        id: 'accounting.journal-entries',
        labelKey: 'NAV.ACCOUNTING_JOURNAL_ENTRIES',
        route: '/accounting/journal-entries',
        access: { anyOf: ['READ_JOURNALENTRY'] },
        phase: 6,
      },
      {
        id: 'accounting.frequent-postings',
        labelKey: 'NAV.ACCOUNTING_FREQUENT_POSTINGS',
        route: '/accounting/frequent-postings',
        access: { anyOf: ['CREATE_JOURNALENTRY'] },
        phase: 6,
      },
      {
        id: 'accounting.opening-balances',
        labelKey: 'NAV.ACCOUNTING_OPENING_BALANCES',
        route: '/accounting/opening-balances',
        access: { anyOf: ['DEFINEOPENINGBALANCE_JOURNALENTRY'] },
        phase: 6,
      },
      {
        id: 'accounting.closures',
        labelKey: 'NAV.ACCOUNTING_CLOSURES',
        route: '/accounting/closures',
        access: { anyOf: ['READ_GLCLOSURE'] },
        phase: 6,
      },
      {
        id: 'accounting.rules',
        labelKey: 'NAV.ACCOUNTING_RULES',
        route: '/accounting/rules',
        access: { anyOf: ['READ_ACCOUNTINGRULE'] },
        phase: 6,
      },
      {
        id: 'accounting.financial-activity-mappings',
        labelKey: 'NAV.ACCOUNTING_FINANCIAL_ACTIVITY_MAPPINGS',
        route: '/accounting/financial-activity-mappings',
        access: { anyOf: ['READ_FINANCIALACTIVITYACCOUNT'] },
        phase: 6,
      },
      {
        id: 'accounting.charges',
        labelKey: 'NAV.ACCOUNTING_CHARGES',
        route: '/accounting/charges',
        access: { anyOf: ['READ_CHARGE'] },
        phase: 6,
      },
      {
        id: 'accounting.provisioning-categories',
        labelKey: 'NAV.ACCOUNTING_PROVISIONING_CATEGORIES',
        route: '/accounting/provisioning-categories',
        access: null,
        phase: 6,
      },
      {
        id: 'accounting.provisioning-criteria',
        labelKey: 'NAV.ACCOUNTING_PROVISIONING_CRITERIA',
        route: '/accounting/provisioning-criteria',
        access: null,
        phase: 6,
      },
      {
        id: 'accounting.provisioning-entries',
        labelKey: 'NAV.ACCOUNTING_PROVISIONING_ENTRIES',
        route: '/accounting/provisioning-entries',
        access: null,
        phase: 6,
      },
      {
        id: 'accounting.run-accruals',
        labelKey: 'NAV.ACCOUNTING_RUN_ACCRUALS',
        route: '/accounting/run-accruals',
        access: { anyOf: ['EXECUTEJOB_SCHEDULER'] },
        phase: 6,
      },
    ],
  },
  {
    id: 'tasks',
    labelKey: 'NAV.TASKS',
    children: [
      {
        id: 'tasks.work-queues',
        labelKey: 'NAV.TASKS_WORK_QUEUES',
        route: '/tasks/work-queues',
        access: { anyOf: ['READ_LOAN', 'READ_CLIENT'] },
        phase: 7,
      },
      {
        id: 'tasks.checker-inbox',
        labelKey: 'NAV.TASKS_CHECKER_INBOX',
        route: '/tasks/checker-inbox',
        access: { anyOf: ['READ_AUDIT'] },
        phase: 7,
      },
    ],
  },
  {
    id: 'security',
    labelKey: 'NAV.SECURITY',
    children: [
      {
        id: 'security.users',
        labelKey: 'NAV.SECURITY_USERS',
        route: '/security/users',
        access: { anyOf: ['READ_USER'] },
        phase: 7,
      },
      {
        id: 'security.roles',
        labelKey: 'NAV.SECURITY_ROLES',
        route: '/security/roles',
        access: { anyOf: ['READ_ROLE'] },
        phase: 7,
      },
      {
        id: 'security.audits',
        labelKey: 'NAV.SECURITY_AUDITS',
        route: '/security/audits',
        access: { anyOf: ['READ_AUDIT'] },
        phase: 7,
      },
    ],
  },
  {
    id: 'reporting',
    labelKey: 'NAV.REPORTING',
    children: [
      {
        id: 'reporting.reports',
        labelKey: 'NAV.REPORTING_REPORTS',
        route: '/reporting',
        access: { anyOf: ['READ_REPORT'] },
        phase: 9,
      },
    ],
  },
  {
    id: 'settings',
    labelKey: 'NAV.SETTINGS',
    children: [
      {
        id: 'settings.configurations',
        labelKey: 'NAV.SETTINGS_CONFIGURATIONS',
        route: '/settings/configurations',
        access: { anyOf: ['READ_CONFIGURATION'] },
        phase: 8,
      },
      {
        id: 'settings.holidays',
        labelKey: 'NAV.SETTINGS_HOLIDAYS',
        route: '/settings/holidays',
        access: { anyOf: ['READ_HOLIDAY'] },
        phase: 8,
      },
      {
        id: 'settings.working-days',
        labelKey: 'NAV.SETTINGS_WORKING_DAYS',
        route: '/settings/working-days',
        access: { anyOf: ['READ_WORKINGDAYS'] },
        phase: 8,
      },
      {
        id: 'settings.two-factor',
        labelKey: 'NAV.SETTINGS_TWO_FACTOR',
        route: '/settings/two-factor',
        access: { anyOf: ['READ_TWOFACTOR_CONFIGURATION'] },
        phase: 8,
      },
    ],
  },
  {
    id: 'teller-operations',
    labelKey: 'NAV.TELLER_OPERATIONS',
    children: [
      {
        id: 'teller-operations.tellers',
        labelKey: 'NAV.TELLER_OPERATIONS_TELLERS',
        route: '/tellers',
        access: null,
        phase: 6,
      },
    ],
  },
  {
    id: 'organization',
    labelKey: 'NAV.ORGANIZATION',
    children: [
      {
        id: 'organization.offices',
        labelKey: 'NAV.ORGANIZATION_OFFICES',
        route: '/organization/offices',
        access: { anyOf: ['READ_OFFICE'] },
        phase: 1,
      },
      {
        id: 'organization.staff',
        labelKey: 'NAV.ORGANIZATION_STAFF',
        route: '/organization/staff',
        access: { anyOf: ['READ_STAFF'] },
        phase: 1,
      },
      {
        id: 'organization.funds',
        labelKey: 'NAV.ORGANIZATION_FUNDS',
        route: '/organization/funds',
        access: { anyOf: ['READ_FUND'] },
        phase: 7,
      },
      {
        id: 'organization.payment-types',
        labelKey: 'NAV.ORGANIZATION_PAYMENT_TYPES',
        route: '/organization/payment-types',
        access: { anyOf: ['READ_PAYMENTTYPE'] },
        phase: 7,
      },
      {
        id: 'organization.group-levels',
        labelKey: 'NAV.ORGANIZATION_GROUP_LEVELS',
        route: '/organization/group-levels',
        access: null,
        phase: 7,
      },
      {
        id: 'organization.currencies',
        labelKey: 'NAV.ORGANIZATION_CURRENCIES',
        route: '/organization/currencies',
        access: { anyOf: ['READ_CURRENCY'] },
        phase: 7,
      },
      {
        id: 'organization.account-number-formats',
        labelKey: 'NAV.ORGANIZATION_ACCOUNT_NUMBER_FORMATS',
        route: '/organization/account-number-formats',
        access: { anyOf: ['READ_ACCOUNTNUMBERFORMAT'] },
        phase: 7,
      },
      {
        id: 'organization.office-transactions',
        labelKey: 'NAV.ORGANIZATION_OFFICE_TRANSACTIONS',
        route: '/organization/office-transactions',
        access: { anyOf: ['READ_OFFICE'] },
        phase: 7,
      },
      {
        id: 'organization.loan-portfolio-summary',
        labelKey: 'NAV.ORGANIZATION_LOAN_PORTFOLIO_SUMMARY',
        route: '/organization/loan-portfolio-summary',
        access: { anyOf: ['READ_LOAN'] },
        phase: 7,
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'NAV.SYSTEM',
    children: [
      {
        id: 'system.data-tables',
        labelKey: 'NAV.SYSTEM_DATA_TABLES',
        route: '/system/data-tables',
        access: { anyOf: ['READ_DATATABLE'] },
        phase: 8,
      },
      {
        id: 'system.bulk-import',
        labelKey: 'NAV.SYSTEM_BULK_IMPORT',
        route: '/system/bulk-import',
        access: { anyOf: ['READ_IMPORT'] },
        phase: 8,
      },
      {
        id: 'system.delinquency',
        labelKey: 'NAV.SYSTEM_DELINQUENCY',
        route: '/system/delinquency',
        access: { anyOf: ['READ_DELINQUENCY_BUCKET'] },
        phase: 8,
      },
      {
        id: 'system.hooks',
        labelKey: 'NAV.SYSTEM_HOOKS',
        route: '/system/hooks',
        access: { anyOf: ['READ_HOOK'] },
        phase: 8,
      },
      {
        id: 'system.credit-bureau-config',
        labelKey: 'NAV.SYSTEM_CREDIT_BUREAU_CONFIG',
        route: '/system/credit-bureau-config',
        access: { anyOf: ['UPDATE_CREDITBUREAU_CONFIGURATION'] },
        phase: 8,
      },
      {
        id: 'system.adhoc-query',
        labelKey: 'NAV.SYSTEM_ADHOC_QUERY',
        route: '/system/adhoc-query',
        access: null,
        phase: 8,
      },
      {
        id: 'system.sms',
        labelKey: 'NAV.SYSTEM_SMS',
        route: '/system/sms',
        access: { anyOf: ['READ_SMS'] },
        phase: 8,
      },
      {
        id: 'system.report-definitions',
        labelKey: 'NAV.SYSTEM_REPORT_DEFINITIONS',
        route: '/system/report-definitions',
        access: { anyOf: ['READ_REPORT'] },
        phase: 8,
      },
      {
        id: 'system.report-mailing-jobs',
        labelKey: 'NAV.SYSTEM_REPORT_MAILING_JOBS',
        route: '/system/report-mailing-jobs',
        access: { anyOf: ['READ_REPORTMAILINGJOB'] },
        phase: 8,
      },
      {
        id: 'system.entity-data-table-checks',
        labelKey: 'NAV.SYSTEM_ENTITY_DATA_TABLE_CHECKS',
        route: '/system/entity-data-table-checks',
        access: { anyOf: ['READ_ENTITY_DATATABLE_CHECK'] },
        phase: 8,
      },
      {
        id: 'system.entity-mapping',
        labelKey: 'NAV.SYSTEM_ENTITY_MAPPING',
        route: '/system/entity-mapping',
        access: null,
        phase: 8,
      },
      {
        id: 'system.scheduler-jobs',
        labelKey: 'NAV.SYSTEM_SCHEDULER_JOBS',
        route: '/system/scheduler-jobs',
        access: { anyOf: ['READ_SCHEDULER'] },
        phase: 8,
      },
      {
        id: 'system.permissions',
        labelKey: 'NAV.SYSTEM_PERMISSIONS',
        route: '/system/permissions',
        access: { anyOf: ['READ_PERMISSION'] },
        phase: 8,
      },
      {
        id: 'system.business-steps',
        labelKey: 'NAV.SYSTEM_BUSINESS_STEPS',
        route: '/system/business-steps',
        access: { anyOf: ['UPDATE_BATCH_BUSINESS_STEP'] },
        phase: 8,
      },
      {
        id: 'system.cache',
        labelKey: 'NAV.SYSTEM_CACHE',
        route: '/system/cache',
        access: { anyOf: ['READ_CACHE'] },
        phase: 8,
      },
      {
        id: 'system.external-events',
        labelKey: 'NAV.SYSTEM_EXTERNAL_EVENTS',
        route: '/system/external-events',
        access: { anyOf: ['READ_EXTERNAL_EVENT_CONFIGURATION'] },
        phase: 8,
      },
      {
        id: 'system.external-services',
        labelKey: 'NAV.SYSTEM_EXTERNAL_SERVICES',
        route: '/system/external-services',
        access: { anyOf: ['UPDATE_EXTERNALSERVICES'] },
        phase: 8,
      },
      {
        id: 'system.password-preferences',
        labelKey: 'NAV.SYSTEM_PASSWORD_PREFERENCES',
        route: '/system/password-preferences',
        access: { anyOf: ['READ_PASSWORD_PREFERENCES'] },
        phase: 8,
      },
      {
        id: 'system.notifications-config',
        labelKey: 'NAV.SYSTEM_NOTIFICATIONS_CONFIG',
        route: '/system/notifications-config',
        access: { anyOf: ['READ_EMAIL_CONFIGURATION'] },
        phase: 8,
      },
      {
        id: 'system.instance-mode',
        labelKey: 'NAV.SYSTEM_INSTANCE_MODE',
        route: '/system/instance-mode',
        access: null,
        phase: 8,
      },
      {
        id: 'system.oidc-config',
        labelKey: 'NAV.SYSTEM_OIDC_CONFIG',
        route: '/system/oidc-config',
        access: null,
        phase: 8,
      },
      {
        id: 'system.field-configuration',
        labelKey: 'NAV.SYSTEM_FIELD_CONFIGURATION',
        route: '/system/field-configuration',
        access: null,
        phase: 8,
      },
      {
        id: 'system.loan-product-details',
        labelKey: 'NAV.SYSTEM_LOAN_PRODUCT_DETAILS',
        route: '/system/loan-product-details',
        access: null,
        phase: 8,
      },
      {
        id: 'system.codes',
        labelKey: 'NAV.SYSTEM_CODES',
        route: '/system/codes',
        access: { anyOf: ['READ_CODE'] },
        phase: 8,
      },
      {
        id: 'system.business-dates',
        labelKey: 'NAV.SYSTEM_BUSINESS_DATES',
        route: '/system/business-dates',
        access: { anyOf: ['READ_BUSINESS_DATE'] },
        phase: 8,
      },
      {
        id: 'system.templates',
        labelKey: 'NAV.SYSTEM_TEMPLATES',
        route: '/system/templates',
        access: { anyOf: ['READ_TEMPLATE'] },
        phase: 8,
      },
    ],
  },
];
