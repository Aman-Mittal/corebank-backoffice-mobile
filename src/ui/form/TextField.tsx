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

import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';

/**
 * A labelled text input with its error underneath. `testID` names the input; the error is
 * `TID.fieldError(testID)`. Read-only fields stay focusable and readable but cannot change.
 */
export function TextField({
  label,
  testID,
  value,
  onChangeText,
  onBlur,
  error,
  hint,
  readOnly = false,
  inputProps,
}: {
  readonly label: string;
  readonly testID: string;
  readonly value: string;
  readonly onChangeText?: (text: string) => void;
  readonly onBlur?: () => void;
  readonly error?: string | undefined;
  readonly hint?: string;
  readonly readOnly?: boolean;
  readonly inputProps?: TextInputProps;
}) {
  const labelId = `${testID}-label`;
  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        aria-labelledby={labelId}
        aria-invalid={error ? true : undefined}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        editable={!readOnly}
        readOnly={readOnly}
        style={[styles.input, readOnly && styles.readOnly, error ? styles.invalid : null]}
        {...inputProps}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? (
        <Text testID={TID.fieldError(testID)} role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  label: { fontSize: 14, color: colors.text },
  error: { fontSize: 13, color: colors.danger },
});

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: fieldStyles.label,
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  readOnly: { backgroundColor: colors.background, color: colors.textMuted },
  invalid: { borderColor: colors.danger },
  hint: { fontSize: 13, color: colors.textMuted },
  error: fieldStyles.error,
});
