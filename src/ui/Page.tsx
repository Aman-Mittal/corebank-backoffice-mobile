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

import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/ui/theme';

/**
 * A screen's frame: one level-1 heading, optional actions beside it, then the content. Every
 * module screen uses it, so headings and spacing agree across modules.
 */
export function Page({
  testID,
  title,
  titleTestID,
  actions,
  children,
}: {
  readonly testID: string;
  readonly title: string;
  readonly titleTestID?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <ScrollView
      testID={testID}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text testID={titleTestID} role="heading" aria-level={1} style={styles.title}>
          {title}
        </Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {children}
    </ScrollView>
  );
}

/** One label/value line of a record's details. An absent value shows a dash, never a blank. */
export function DetailRow({
  label,
  testID,
  children,
}: {
  readonly label: string;
  readonly testID?: string;
  readonly children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.term}>{label}</Text>
      <View testID={testID} style={styles.value}>
        {typeof children === 'string' || children === null || children === undefined ? (
          <Text style={styles.valueText}>{children || '—'}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  term: { width: 160, fontSize: 14, color: colors.textMuted },
  value: { flex: 1, minWidth: 160 },
  valueText: { fontSize: 16, color: colors.text },
});
