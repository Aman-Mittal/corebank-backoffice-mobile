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
import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { codesOf, type Access } from '@/core/auth/permissions';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../e2e/shared/testids';

/**
 * Shown in place of a screen the user may not open. The URL is kept, so Back works and the
 * address says what was asked for.
 *
 * The user did not ask to come here, so focus moves to the heading and the explanation is
 * announced politely. It names the codes the screen needs, so the user can ask for them.
 */
export function AccessDenied({ access }: { readonly access: Access }) {
  const { t } = useI18n();
  const router = useRouter();
  const heading = useRef<Text>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Focusable by script only (tabindex -1), so the heading is not an extra tab stop.
    const node = heading.current as unknown as HTMLElement | null;
    node?.setAttribute('tabindex', '-1');
    node?.focus();
  }, []);
  const codes = codesOf(access).join(', ');

  return (
    <ScrollView testID={TID.accessDenied.screen} contentContainerStyle={styles.container}>
      <Text
        ref={heading}
        testID={TID.accessDenied.heading}
        role="heading"
        aria-level={1}
        style={styles.title}
      >
        {t('ACCESS_DENIED.TITLE')}
      </Text>
      <View role="status" aria-live="polite" style={styles.body}>
        <Text style={styles.text}>{t('ACCESS_DENIED.BODY')}</Text>
        <Text testID={TID.accessDenied.required} style={styles.codes}>
          {t('anyOf' in access ? 'ACCESS_DENIED.REQUIRED_ANY' : 'ACCESS_DENIED.REQUIRED_ALL', {
            codes,
          })}
        </Text>
      </View>
      <Pressable
        testID={TID.accessDenied.home}
        role="link"
        onPress={() => router.replace('/home')}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{t('ACCESS_DENIED.HOME')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { gap: spacing.sm },
  text: { fontSize: 16, color: colors.text },
  codes: {
    fontSize: 15,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    color: colors.text,
  },
  button: {
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
