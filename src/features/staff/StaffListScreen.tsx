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
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Staff } from '@/core/adapters/api/staff.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { href } from '@/core/navigation/href';
import { useOffices } from '@/features/offices/useOffices';
import { Button } from '@/ui/form/Button';
import { SelectField } from '@/ui/form/SelectField';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { EmptyState, ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { STAFF_ACCESS } from './access';
import { useStaffList } from './useStaff';

type OfficeFilter = 'all' | number;

/**
 * All staff, active and inactive. The office filter narrows the request itself (`officeId`); the
 * search box narrows what is already loaded. The filter is offered only when the user can read
 * offices, since its options come from `GET /offices`.
 */
export function StaffListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = usePermission(STAFF_ACCESS.create);
  const [office, setOffice] = useState<OfficeFilter>('all');
  const [search, setSearch] = useState('');
  const staff = useStaffList({ status: 'all', ...(office === 'all' ? {} : { officeId: office }) });
  const offices = useOffices();

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (staff.data ?? []).filter(
      (s) =>
        !q || [s.displayName, s.firstname, s.lastname].some((n) => n.toLowerCase().includes(q)),
    );
  }, [staff.data, search]);

  return (
    <Page
      testID={TID.staff.screen}
      title={t('STAFF.TITLE')}
      actions={
        canCreate ? (
          <Button
            testID={TID.staff.create}
            label={t('STAFF.NEW')}
            onPress={() => router.push(href('/organization/staff/new'))}
          />
        ) : null
      }
    >
      {offices.isSuccess ? (
        <SelectField<OfficeFilter>
          label={t('STAFF.OFFICE')}
          testID={TID.staff.officeFilter}
          placeholder={t('STAFF.ALL_OFFICES')}
          options={[
            { value: 'all', label: t('STAFF.ALL_OFFICES') },
            ...offices.data.map((o) => ({ value: o.id, label: o.name })),
          ]}
          value={office}
          onChange={setOffice}
        />
      ) : null}
      <TextField
        label={t('STAFF.SEARCH')}
        testID={TID.staff.search}
        value={search}
        onChangeText={setSearch}
        inputProps={{ autoCapitalize: 'none', autoCorrect: false, inputMode: 'search' }}
      />
      {staff.isPending ? (
        <LoadingState />
      ) : staff.isError ? (
        <ErrorState error={staff.error} onRetry={() => void staff.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState message={t(staff.data.length === 0 ? 'STAFF.EMPTY' : 'STAFF.NO_MATCH')} />
      ) : (
        <View role="list">
          {shown.map((member) => (
            <View key={member.id} role="listitem">
              <StaffRow
                member={member}
                onPress={() => router.push(href(`/organization/staff/${member.id}`))}
              />
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

function StaffRow({ member, onPress }: { readonly member: Staff; readonly onPress: () => void }) {
  const { t } = useI18n();
  const meta = [
    member.officeName,
    member.isLoanOfficer ? t('STAFF.LOAN_OFFICER') : null,
    t(member.isActive ? 'COMMON.ACTIVE' : 'COMMON.INACTIVE'),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable testID={TID.staff.row(member.id)} role="link" onPress={onPress} style={styles.row}>
      <Text style={styles.name}>{member.displayName}</Text>
      <Text style={[styles.meta, !member.isActive && styles.inactive]}>{meta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted },
  inactive: { fontStyle: 'italic' },
});
