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

import type { Office } from '@/core/adapters/api/office.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { EmptyState, ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { OFFICE_ACCESS } from './access';
import { depthOf } from './office-tree';
import { useOffices } from './useOffices';

/** Every office, in the server's hierarchy order, indented by depth and filterable by name. */
export function OfficesListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = usePermission(OFFICE_ACCESS.create);
  const offices = useOffices();
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (offices.data ?? []).filter((o) => !q || o.name.toLowerCase().includes(q));
  }, [offices.data, search]);

  return (
    <Page
      testID={TID.offices.screen}
      title={t('OFFICES.TITLE')}
      actions={
        canCreate ? (
          <Button
            testID={TID.offices.create}
            label={t('OFFICES.NEW')}
            onPress={() => router.push(href('/organization/offices/new'))}
          />
        ) : null
      }
    >
      {offices.isPending ? (
        <LoadingState />
      ) : offices.isError ? (
        <ErrorState error={offices.error} onRetry={() => void offices.refetch()} />
      ) : (
        <>
          <TextField
            label={t('OFFICES.SEARCH')}
            testID={TID.offices.search}
            value={search}
            onChangeText={setSearch}
            inputProps={{ autoCapitalize: 'none', autoCorrect: false, inputMode: 'search' }}
          />
          {shown.length === 0 ? (
            <EmptyState message={t('OFFICES.EMPTY')} />
          ) : (
            <View role="list">
              {shown.map((office) => (
                <View key={office.id} role="listitem">
                  <OfficeRow
                    office={office}
                    onPress={() => router.push(href(`/organization/offices/${office.id}`))}
                  />
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Page>
  );
}

function OfficeRow({ office, onPress }: { readonly office: Office; readonly onPress: () => void }) {
  const meta = [office.externalId, office.openingDate].filter(Boolean).join(' · ');
  return (
    <Pressable testID={TID.offices.row(office.id)} role="link" onPress={onPress} style={styles.row}>
      <View style={{ paddingLeft: depthOf(office.hierarchy) * spacing.md }}>
        <Text style={styles.name}>{office.name}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
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
});
