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
import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { DetailRow, Page } from '@/ui/Page';
import { ErrorState, isNotFound, LoadingState, NotFoundState } from '@/ui/ScreenState';
import { colors } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { OFFICE_ACCESS } from './access';
import { useOffice } from './useOffice';

/** One office. The parent is a link to its own page; Edit only for who may edit. */
export function OfficeViewScreen({ officeId }: { readonly officeId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const canEdit = usePermission(OFFICE_ACCESS.update);
  const valid = Number.isInteger(officeId) && officeId > 0;
  const office = useOffice(officeId, { enabled: valid });
  const back = () => router.replace(href('/organization/offices'));

  if (!valid || (office.isError && isNotFound(office.error))) {
    return (
      <Page testID={TID.office.screen} title={t('OFFICES.TITLE')}>
        <NotFoundState
          message={t('OFFICES.NOT_FOUND')}
          backLabel={t('OFFICES.BACK')}
          onBack={back}
        />
      </Page>
    );
  }
  if (office.isPending) return <LoadingState />;
  if (office.isError)
    return <ErrorState error={office.error} onRetry={() => void office.refetch()} />;

  const o = office.data;
  return (
    <Page
      testID={TID.office.screen}
      title={o.name}
      titleTestID={TID.office.name}
      actions={
        canEdit ? (
          <Button
            testID={TID.office.edit}
            label={t('COMMON.EDIT')}
            variant="secondary"
            onPress={() => router.push(href(`/organization/offices/${o.id}/edit`))}
          />
        ) : null
      }
    >
      <DetailRow label={t('OFFICES.PARENT')}>
        {o.parentId === null ? null : (
          <Pressable
            testID={TID.office.parent}
            role="link"
            onPress={() => router.push(href(`/organization/offices/${o.parentId}`))}
          >
            <Text style={styles.link}>{o.parentName ?? String(o.parentId)}</Text>
          </Pressable>
        )}
      </DetailRow>
      <DetailRow label={t('OFFICES.OPENING_DATE')} testID={TID.office.openingDate}>
        {o.openingDate}
      </DetailRow>
      <DetailRow label={t('OFFICES.EXTERNAL_ID')} testID={TID.office.externalId}>
        {o.externalId}
      </DetailRow>
    </Page>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 16, color: colors.primary, textDecorationLine: 'underline' },
});
