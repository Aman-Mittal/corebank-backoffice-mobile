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

import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';

/**
 * Version, licence and the non-endorsement disclaimer (DISCLAIMER.md).
 *
 * Reachable before sign-in on purpose: the disclaimer has to be readable by someone who has not
 * been given an account.
 */
export function AboutScreen() {
  const { t } = useI18n();
  const version = Constants.expoConfig?.version ?? '0.0.0';

  return (
    <ScrollView testID={TID.about.screen} contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('APP.NAME')}
      </Text>
      <Text testID={TID.about.version} style={styles.muted}>
        {t('ABOUT.VERSION', { version })}
      </Text>
      <Text testID={TID.about.license} style={styles.muted}>
        {t('ABOUT.LICENSE')}
      </Text>
      <View style={styles.notice} accessibilityRole="summary">
        <Text accessibilityRole="header" style={styles.noticeTitle}>
          {t('ABOUT.DISCLAIMER_TITLE')}
        </Text>
        <Text testID={TID.about.disclaimer} style={styles.body}>
          {t('ABOUT.DISCLAIMER')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  notice: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
    gap: spacing.sm,
  },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
});
