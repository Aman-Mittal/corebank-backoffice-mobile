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

import { ScrollView, StyleSheet, Text } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import type { NavEntry } from '@/core/navigation/nav-catalogue';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../e2e/shared/testids';

/**
 * A module whose screens a later phase builds. Guarded exactly like the real screen will be, and
 * honest about not being built: it names the phase rather than pretending to be empty.
 */
export function ModulePlaceholder({ entry }: { readonly entry: NavEntry }) {
  const { t } = useI18n();
  return (
    <ScrollView testID={TID.placeholder.screen} contentContainerStyle={styles.container}>
      <Text testID={TID.placeholder.title} role="heading" aria-level={1} style={styles.title}>
        {t(entry.labelKey)}
      </Text>
      <Text testID={TID.placeholder.phase} style={styles.text}>
        {t('PLACEHOLDER.PHASE', { phase: entry.phase })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  text: { fontSize: 16, color: colors.textMuted },
});
