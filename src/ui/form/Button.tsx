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

import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

/** The one button. `primary` for the screen's main action, `secondary` for the others. */
export function Button({
  label,
  testID,
  onPress,
  disabled = false,
  variant = 'primary',
  role = 'button',
}: {
  readonly label: string;
  readonly testID?: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly variant?: 'primary' | 'secondary';
  readonly role?: 'button' | 'link';
}) {
  return (
    <Pressable
      testID={testID}
      role={role}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, styles[variant], disabled && styles.disabled]}
    >
      <Text style={variant === 'primary' ? styles.primaryText : styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  disabled: { opacity: 0.6 },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  secondaryText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
});
