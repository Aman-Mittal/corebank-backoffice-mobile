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

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { fieldStyles } from './TextField';

export interface SelectOption<V extends string | number> {
  readonly value: V;
  readonly label: string;
}

/**
 * A choice from a short list: a button showing the current choice that expands into a radio
 * group. Options are `TID.option(testID, value)`. Disabled, it still shows the value (an edit
 * form shows what cannot change rather than hiding it).
 */
export function SelectField<V extends string | number>({
  label,
  testID,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
}: {
  readonly label: string;
  readonly testID: string;
  readonly options: readonly SelectOption<V>[];
  readonly value: V | null;
  readonly onChange?: (value: V) => void;
  readonly placeholder: string;
  readonly disabled?: boolean;
  readonly error?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value);
  const labelId = `${testID}-label`;
  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={fieldStyles.label}>
        {label}
      </Text>
      <Pressable
        testID={testID}
        role="button"
        aria-labelledby={labelId}
        aria-expanded={disabled ? undefined : open}
        aria-disabled={disabled}
        disabled={disabled}
        onPress={() => setOpen((o) => !o)}
        style={[styles.trigger, disabled && styles.disabled, error ? styles.invalid : null]}
      >
        <Text style={[styles.value, !chosen && styles.placeholder]}>
          {chosen?.label ?? placeholder}
        </Text>
        {disabled ? null : (
          <Text aria-hidden style={styles.chevron}>
            {open ? '▴' : '▾'}
          </Text>
        )}
      </Pressable>
      {open && !disabled ? (
        <View role="radiogroup" aria-labelledby={labelId} style={styles.options}>
          {options.map((o) => (
            <Pressable
              key={o.value}
              testID={TID.option(testID, o.value)}
              role="radio"
              aria-checked={o.value === value}
              onPress={() => {
                onChange?.(o.value);
                setOpen(false);
              }}
              style={[styles.option, o.value === value && styles.optionChosen]}
            >
              <Text style={styles.value}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? (
        <Text testID={TID.fieldError(testID)} role="alert" style={fieldStyles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  trigger: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  disabled: { backgroundColor: colors.background },
  invalid: { borderColor: colors.danger },
  value: { fontSize: 16, color: colors.text },
  placeholder: { color: colors.textMuted },
  chevron: { fontSize: 14, color: colors.textMuted },
  options: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  option: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm },
  optionChosen: { backgroundColor: '#E8EEFC' },
});
