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

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

/** A yes/no choice, as a real checkbox to assistive technology. */
export function CheckboxField({
  label,
  testID,
  value,
  onChange,
}: {
  readonly label: string;
  readonly testID: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      testID={testID}
      role="checkbox"
      aria-checked={value}
      aria-label={label}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <View style={[styles.box, value && styles.boxOn]}>
        {value ? (
          <Text aria-hidden style={styles.tick}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
  label: { fontSize: 16, color: colors.text },
});
