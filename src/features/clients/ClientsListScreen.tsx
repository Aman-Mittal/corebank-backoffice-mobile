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

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Client } from '@/core/adapters/api/client.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { useDebouncedValue } from '@/core/hooks/useDebouncedValue';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { EmptyState, ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { statusText } from './client-labels';
import { lastPage, readListParams, toListParams, type ClientListParams } from './list-params';
import { useClientPage } from './useClients';

export const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

/**
 * Clients, a page at a time from the server. The search box asks the server too (by display
 * name), once typing pauses, and starts again from the first page. People and entities are
 * listed together: no legal-form filter (DOCS/test-plan/P1-05-clients.md).
 *
 * The page and the search live in the URL (`?page=2&q=ada`), so coming back from a client, a
 * reload or a shared link lands where the list was (DOCS/test-plan/P1-09-list-paging-failures.md).
 */
export function ClientsListScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = usePermission(CLIENT_ACCESS.create);
  const position = readListParams(useLocalSearchParams<ClientListParams>());
  const [search, setSearch] = useState(position.search);
  const term = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const goTo = (page: number) => router.setParams(toListParams({ page, search: position.search }));
  // A new search starts at the first page. Only typing moves it: the URL changing under the box
  // (Back) must not write the box's old term over it.
  const typed = useRef(term);
  useEffect(() => {
    if (term === typed.current) return;
    typed.current = term;
    router.setParams(toListParams({ page: 0, search: term }));
  }, [term, router]);
  const page = position.page;
  const clients = useClientPage({
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    ...(position.search ? { search: position.search } : {}),
  });
  const total = clients.data?.total ?? 0;
  const items = clients.data?.items ?? [];
  const last = lastPage(total, PAGE_SIZE);
  // A page past the end (a link kept after clients closed) shows the last page instead.
  const pastEnd = clients.isSuccess && !clients.isPlaceholderData && total > 0 && page > last;
  useEffect(() => {
    if (pastEnd) router.setParams(toListParams({ page: last, search: position.search }));
  }, [pastEnd, last, position.search, router]);

  return (
    <Page
      testID={TID.clients.screen}
      title={t('CLIENTS.TITLE')}
      actions={
        canCreate ? (
          <Button
            testID={TID.clients.create}
            label={t('CLIENTS.NEW')}
            onPress={() => router.push(href('/clients/new'))}
          />
        ) : null
      }
    >
      <TextField
        label={t('CLIENTS.SEARCH')}
        testID={TID.clients.search}
        value={search}
        onChangeText={setSearch}
        inputProps={{ autoCapitalize: 'none', autoCorrect: false, inputMode: 'search' }}
      />
      {clients.isPending ? (
        <LoadingState />
      ) : clients.isError ? (
        <ErrorState error={clients.error} onRetry={() => void clients.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState message={t(position.search ? 'CLIENTS.NO_MATCH' : 'CLIENTS.EMPTY')} />
      ) : (
        <>
          <View role="list">
            {items.map((client) => (
              <View key={client.id} role="listitem">
                <ClientRow
                  client={client}
                  onPress={() => router.push(href(`/clients/${client.id}`))}
                />
              </View>
            ))}
          </View>
          <View style={styles.pager}>
            <Button
              testID={TID.clients.first}
              label={t('CLIENTS.FIRST')}
              variant="secondary"
              disabled={page === 0}
              onPress={() => goTo(0)}
            />
            <Button
              testID={TID.clients.previous}
              label={t('CLIENTS.PREVIOUS')}
              variant="secondary"
              disabled={page === 0}
              onPress={() => goTo(page - 1)}
            />
            <Text testID={TID.clients.range} style={styles.range}>
              {t('CLIENTS.RANGE', {
                from: String(page * PAGE_SIZE + 1),
                to: String(page * PAGE_SIZE + items.length),
                total: String(total),
              })}
            </Text>
            <Button
              testID={TID.clients.next}
              label={t('CLIENTS.NEXT')}
              variant="secondary"
              disabled={page >= last}
              onPress={() => goTo(page + 1)}
            />
            <Button
              testID={TID.clients.last}
              label={t('CLIENTS.LAST')}
              variant="secondary"
              disabled={page >= last}
              onPress={() => goTo(last)}
            />
          </View>
        </>
      )}
    </Page>
  );
}

function ClientRow({ client, onPress }: { readonly client: Client; readonly onPress: () => void }) {
  const { t } = useI18n();
  const meta = [client.accountNo, client.officeName, statusText(client, t)]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable testID={TID.clients.row(client.id)} role="link" onPress={onPress} style={styles.row}>
      <Text style={styles.name}>{client.displayName}</Text>
      <Text style={styles.meta}>{meta}</Text>
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
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  range: { fontSize: 14, color: colors.textMuted },
});
