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

import { useRouter } from 'expo-router';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { DetailRow, Page } from '@/ui/Page';
import { ErrorState, isNotFound, LoadingState, NotFoundState } from '@/ui/ScreenState';

import { TID } from '../../../e2e/shared/testids';
import { STAFF_ACCESS } from './access';
import { useStaffMember } from './useStaff';

export function StaffViewScreen({ staffId }: { readonly staffId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const canEdit = usePermission(STAFF_ACCESS.update);
  const valid = Number.isInteger(staffId) && staffId > 0;
  const member = useStaffMember(staffId, { enabled: valid });

  if (!valid || (member.isError && isNotFound(member.error))) {
    return (
      <Page testID={TID.staffMember.screen} title={t('STAFF.TITLE')}>
        <NotFoundState
          message={t('STAFF.NOT_FOUND')}
          backLabel={t('STAFF.BACK')}
          onBack={() => router.replace(href('/organization/staff'))}
        />
      </Page>
    );
  }
  if (member.isPending) return <LoadingState />;
  if (member.isError)
    return <ErrorState error={member.error} onRetry={() => void member.refetch()} />;

  const s = member.data;
  return (
    <Page
      testID={TID.staffMember.screen}
      title={s.displayName}
      titleTestID={TID.staffMember.name}
      actions={
        canEdit ? (
          <Button
            testID={TID.staffMember.edit}
            label={t('COMMON.EDIT')}
            variant="secondary"
            onPress={() => router.push(href(`/organization/staff/${s.id}/edit`))}
          />
        ) : null
      }
    >
      <DetailRow label={t('STAFF.OFFICE')} testID={TID.staffMember.office}>
        {s.officeName}
      </DetailRow>
      <DetailRow label={t('STAFF.MOBILE')} testID={TID.staffMember.mobile}>
        {s.mobileNo}
      </DetailRow>
      <DetailRow label={t('STAFF.EMAIL')} testID={TID.staffMember.email}>
        {s.emailAddress}
      </DetailRow>
      <DetailRow label={t('STAFF.EXTERNAL_ID')} testID={TID.staffMember.externalId}>
        {s.externalId}
      </DetailRow>
      <DetailRow label={t('STAFF.JOINING_DATE')} testID={TID.staffMember.joiningDate}>
        {s.joiningDate}
      </DetailRow>
      <DetailRow label={t('STAFF.LOAN_OFFICER')} testID={TID.staffMember.loanOfficer}>
        {t(s.isLoanOfficer ? 'COMMON.YES' : 'COMMON.NO')}
      </DetailRow>
      <DetailRow label={t('STAFF.STATUS')} testID={TID.staffMember.status}>
        {t(s.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE')}
      </DetailRow>
    </Page>
  );
}
