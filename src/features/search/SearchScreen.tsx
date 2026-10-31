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

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { SEARCH_API, type SearchHit, type SearchHitType } from '@/core/adapters/api/search.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { useGranted } from '@/core/auth/usePermission';
import { useDebouncedValue } from '@/core/hooks/useDebouncedValue';
import { href } from '@/core/navigation/href';
import { searchRoutes } from '@/core/navigation/search-routes';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { LoadingState } from '@/ui/ScreenState';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';

/** As the reference: a phrase typed straight through is one request. */
export const SEARCH_DELAY_MS = 300;
/** The reference sends no one-character search. */
export const MIN_QUERY = 2;

/** Where each record opens; loans and savings open their module's placeholder until built. */
const ROUTES: Record<SearchHitType, (id: number) => `/${string}`> = {
  client: (id) => `/clients/${id}`,
  loan: (id) => `/loans/${id}`,
  savings: (id) => `/products/savings-accounts/${id}`,
};

const TYPE_KEYS: Record<SearchHitType, string> = {
  client: 'SEARCH.TYPE.CLIENT',
  loan: 'SEARCH.TYPE.LOAN',
  savings: 'SEARCH.TYPE.SAVINGS',
};

/** Records and screens by name (DOCS/test-plan/P1-14-search-breadcrumbs.md). */
export function SearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const api = useAdapter(SEARCH_API);
  const granted = useGranted();
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), SEARCH_DELAY_MS);
  const ready = query.length >= MIN_QUERY;
  const records = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search(query),
    enabled: ready,
  });
  const shortcuts = ready ? searchRoutes(query, (e) => t(e.labelKey), granted) : [];
  const hits = records.data ?? [];
  const nothing = ready && !records.isPending && shortcuts.length === 0 && hits.length === 0;

  return (
    <Page testID={TID.search.screen} title={t('SEARCH.TITLE')}>
      <TextField
        label={t('SEARCH.QUERY')}
        testID={TID.search.query}
        value={text}
        onChangeText={setText}
        inputProps={{ autoCorrect: false, autoCapitalize: 'none', inputMode: 'search' }}
      />
      {ready ? null : (
        <Text testID={TID.search.hint} style={styles.note}>
          {t('SEARCH.HINT')}
        </Text>
      )}
      {shortcuts.length > 0 ? (
        <View style={styles.group}>
          <Text role="heading" aria-level={2} style={styles.heading}>
            {t('SEARCH.SHORTCUTS')}
          </Text>
          {shortcuts.map((e) => (
            <Row
              key={e.id}
              testID={TID.search.shortcut(e.id)}
              title={t(e.labelKey)}
              onPress={() => router.push(href(e.route))}
            />
          ))}
        </View>
      ) : null}
      {ready && records.isPending ? <LoadingState /> : null}
      {records.isError ? (
        <Text testID={TID.search.failed} role="alert" style={styles.error}>
          {t('SEARCH.FAILED')}
        </Text>
      ) : null}
      {hits.length > 0 ? (
        <View style={styles.group}>
          <Text role="heading" aria-level={2} style={styles.heading}>
            {t('SEARCH.RECORDS')}
          </Text>
          {hits.map((h) => (
            <Record key={`${h.type}.${h.id}`} hit={h} onOpen={(path) => router.push(href(path))} />
          ))}
        </View>
      ) : null}
      {nothing && !records.isError ? (
        <Text testID={TID.search.empty} style={styles.note}>
          {t('SEARCH.EMPTY')}
        </Text>
      ) : null}
    </Page>
  );
}

function Record({
  hit: h,
  onOpen,
}: {
  readonly hit: SearchHit;
  readonly onOpen: (path: `/${string}`) => void;
}) {
  const { t } = useI18n();
  const detail = [t(TYPE_KEYS[h.type]), h.accountNo, h.officeName].filter(Boolean).join(' · ');
  return (
    <Row
      testID={TID.search.result(h.type, h.id)}
      title={h.name}
      detail={detail}
      onPress={() => onOpen(ROUTES[h.type](h.id))}
    />
  );
}

function Row({
  testID,
  title,
  detail,
  onPress,
}: {
  readonly testID: string;
  readonly title: string;
  readonly detail?: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable testID={testID} role="link" onPress={onPress} style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.note}>{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs, paddingTop: spacing.sm },
  heading: { fontSize: 16, fontWeight: '600', color: colors.text },
  row: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, color: colors.primary },
  note: { fontSize: 14, color: colors.text },
  error: { fontSize: 14, color: colors.danger },
});
