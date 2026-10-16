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
import { useSession } from '@/core/auth/useSession';
import { useOffice } from '@/features/offices/useOffice';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';

/**
 * The signed-in landing screen. Phase 1's dashboard and navigation shell build on this; for now
 * it confirms who is signed in and reads the user's office, which is also the first authenticated
 * request a session makes.
 */
export function HomeScreen() {
  const { t } = useI18n();
  const session = useSession();
  const signedIn = session.status === 'signedIn';
  const office = useOffice(signedIn ? session.session.officeId : 0, { enabled: signedIn });
  if (session.status !== 'signedIn') return null;
  const { username, displayName, officeName } = session.session;

  return (
    <ScrollView testID={TID.home.screen} contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('HOME.TITLE')}
      </Text>
      <Text testID={TID.home.welcome} style={styles.text}>
        {t('HOME.WELCOME', { name: displayName ? `${username} (${displayName})` : username })}
      </Text>
      <Text testID={TID.home.office} style={styles.muted}>
        {t('HOME.OFFICE', { office: office.data?.name ?? officeName })}
      </Text>
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
  text: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
});
