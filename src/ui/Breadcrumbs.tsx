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

import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { breadcrumbTrail } from '@/core/navigation/breadcrumbs';
import { href } from '@/core/navigation/href';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../e2e/shared/testids';

/**
 * Where a nested screen sits: its module's pages as links, then its own title
 * (DOCS/test-plan/P1-14-search-breadcrumbs.md). A module's own page shows nothing: one crumb
 * would only repeat the heading.
 */
export function Breadcrumbs({ title }: { readonly title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const trail = breadcrumbTrail(usePathname());
  if (trail.length === 0) return null;
  return (
    <View
      testID={TID.breadcrumb.trail}
      role="navigation"
      aria-label={t('SHELL.BREADCRUMB')}
      style={styles.trail}
    >
      {trail.map((e) => (
        <View key={e.id} style={styles.step}>
          <Pressable
            testID={TID.breadcrumb.crumb(e.id)}
            role="link"
            onPress={() => router.push(href(e.route))}
            style={styles.link}
          >
            <Text style={styles.linkText}>{t(e.labelKey)}</Text>
          </Pressable>
          <Text aria-hidden style={styles.separator}>
            ›
          </Text>
        </View>
      ))}
      <Text testID={TID.breadcrumb.current} aria-current="page" style={styles.current}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trail: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
  separator: { fontSize: 14, color: colors.text },
  current: { fontSize: 14, color: colors.text },
});
