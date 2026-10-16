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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { useSession } from '@/core/auth/useSession';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { NavList } from './NavList';

/** The one layout breakpoint (DOCS/MOBILE: same 768 as fineract-backoffice-ui). */
export const WIDE_MIN_WIDTH = 768;

/**
 * The signed-in frame. At 768 dp and wider: a permanent sidebar with the navigation and
 * sign-out. Narrower: a header with a menu button and sign-out, and the navigation in a modal
 * drawer that takes focus, closes on Escape / back / backdrop / its own button, and closes when a
 * destination is chosen. A closed drawer is not rendered, so it is out of the tab order.
 */
export function AppShell({ children }: { readonly children: ReactNode }) {
  const wide = useWindowDimensions().width >= WIDE_MIN_WIDTH;
  return wide ? <WideShell>{children}</WideShell> : <NarrowShell>{children}</NarrowShell>;
}

function SignOutButton({ style }: { readonly style?: object }) {
  const { t } = useI18n();
  const { store } = useSession();
  return (
    <Pressable
      testID={TID.shell.signOut}
      role="button"
      onPress={() => void store.signOut()}
      style={[styles.signOut, style]}
    >
      <Text style={styles.signOutText}>{t('SHELL.SIGN_OUT')}</Text>
    </Pressable>
  );
}

function WideShell({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  return (
    <View style={styles.wide}>
      <View
        testID={TID.shell.sidebar}
        role="navigation"
        aria-label={t('SHELL.NAVIGATION')}
        style={styles.sidebar}
      >
        <Text style={styles.brand}>{t('APP.NAME')}</Text>
        <ScrollView style={styles.navScroll}>
          <NavList />
        </ScrollView>
        <SignOutButton style={styles.sidebarSignOut} />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function NarrowShell({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.narrow}>
      <View style={styles.header}>
        <Pressable
          testID={TID.shell.menuButton}
          role="button"
          aria-label={t('SHELL.MENU')}
          aria-expanded={open}
          onPress={() => setOpen(true)}
          style={styles.iconButton}
        >
          <Text style={styles.icon}>☰</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('APP.NAME')}
        </Text>
        <SignOutButton />
      </View>
      <View style={styles.content}>{children}</View>
      {open && <Drawer onClose={() => setOpen(false)} />}
    </View>
  );
}

function Drawer({ onClose }: { readonly onClose: () => void }) {
  const { t } = useI18n();
  const close = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      (close.current as unknown as HTMLElement | null)?.focus();
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        testID={TID.shell.backdrop}
        aria-label={t('SHELL.CLOSE_MENU')}
        onPress={onClose}
        style={[StyleSheet.absoluteFill, styles.backdrop]}
      />
      <View
        testID={TID.shell.drawer}
        role="dialog"
        aria-modal
        aria-label={t('SHELL.NAVIGATION')}
        style={styles.drawer}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.brand}>{t('APP.NAME')}</Text>
          <Pressable
            ref={close}
            testID={TID.shell.drawerClose}
            role="button"
            aria-label={t('SHELL.CLOSE_MENU')}
            onPress={onClose}
            style={styles.iconButton}
          >
            <Text style={styles.icon}>✕</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.navScroll}>
          <NavList onNavigate={onClose} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wide: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  navScroll: { flex: 1 },
  brand: { padding: spacing.md, fontSize: 18, fontWeight: '700', color: colors.text },
  sidebarSignOut: { margin: spacing.md },
  content: { flex: 1 },
  narrow: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  iconButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22, color: colors.text },
  signOut: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  backdrop: { backgroundColor: 'rgba(17, 24, 39, 0.45)' },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '82%',
    maxWidth: 320,
    backgroundColor: colors.surface,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
});
