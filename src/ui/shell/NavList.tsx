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
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { useGranted } from '@/core/auth/usePermission';
import { isGroup, type NavEntry, type NavGroup } from '@/core/navigation/nav-catalogue';
import { normalisePath } from '@/core/navigation/route-access';
import { href } from '@/core/navigation/href';
import { visibleNav } from '@/core/navigation/visible-nav';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';

/**
 * The navigation the signed-in user may see (`visibleNav`), shared by the sidebar and the drawer.
 * Groups start collapsed except the one holding the current route; a collapsed group's entries
 * stay in the tree, hidden, so they are out of the tab order and the accessibility tree.
 */
export function NavList({ onNavigate }: { readonly onNavigate?: () => void }) {
  const nav = visibleNav(useGranted());
  return (
    <View role="list">
      {nav.map((node) =>
        isGroup(node) ? (
          <Group key={node.id} group={node} onNavigate={onNavigate} />
        ) : (
          <View key={node.id} role="listitem">
            <Item entry={node} onNavigate={onNavigate} />
          </View>
        ),
      )}
    </View>
  );
}

function Group({
  group,
  onNavigate,
}: {
  readonly group: NavGroup;
  readonly onNavigate?: (() => void) | undefined;
}) {
  const { t } = useI18n();
  const path = normalisePath(usePathname());
  const holdsCurrent = group.children.some(
    (c) => path === c.route || path.startsWith(`${c.route}/`),
  );
  const [expanded, setExpanded] = useState(holdsCurrent);
  return (
    <View role="listitem">
      <Pressable
        testID={TID.shell.navGroup(group.id)}
        role="button"
        aria-expanded={expanded}
        onPress={() => setExpanded((e) => !e)}
        style={styles.row}
      >
        <Text style={styles.groupLabel}>{t(group.labelKey)}</Text>
        <Text aria-hidden style={styles.chevron}>
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>
      <View
        role="list"
        style={[styles.children, !expanded && styles.hidden]}
        aria-hidden={!expanded}
      >
        {group.children.map((entry) => (
          <View key={entry.id} role="listitem">
            <Item entry={entry} onNavigate={onNavigate} nested />
          </View>
        ))}
      </View>
    </View>
  );
}

function Item({
  entry,
  onNavigate,
  nested = false,
}: {
  readonly entry: NavEntry;
  readonly onNavigate?: (() => void) | undefined;
  readonly nested?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const path = normalisePath(usePathname());
  const current = path === entry.route || path.startsWith(`${entry.route}/`);
  return (
    <Pressable
      testID={TID.shell.navItem(entry.id)}
      role="link"
      aria-current={current ? 'page' : undefined}
      onPress={() => {
        onNavigate?.();
        router.push(href(entry.route));
      }}
      style={[styles.row, nested && styles.nested, current && styles.current]}
    >
      <Text style={[styles.itemLabel, current && styles.currentLabel]}>{t(entry.labelKey)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nested: { paddingLeft: spacing.xl },
  current: { backgroundColor: '#E8EEFC' },
  children: {},
  hidden: { display: 'none' },
  groupLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  chevron: { fontSize: 14, color: colors.textMuted },
  itemLabel: { fontSize: 15, color: colors.text },
  currentLabel: { color: colors.primary, fontWeight: '600' },
});
