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

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { AppError } from '@/core/http/app-error';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../e2e/shared/testids';
import { Button } from './form/Button';

/** Shown while a screen's first read is in flight. */
export function LoadingState() {
  const { t } = useI18n();
  return (
    <View testID={TID.state.loading} style={styles.box} aria-label={t('SHELL.LOADING')}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

/**
 * A read failed. Says why in the user's terms, and offers to try again unless the server refused
 * the user's role: that is refused the same way every time (DOCS/test-plan/P1-15-…md).
 */
export function ErrorState({
  error,
  onRetry,
}: {
  readonly error: unknown;
  readonly onRetry: () => void;
}) {
  const { t } = useI18n();
  const refused = error instanceof AppError && error.kind === 'forbidden';
  const message =
    error instanceof AppError && (error.kind === 'network' || error.kind === 'timeout')
      ? t('COMMON.ERRORS.NETWORK')
      : refused
        ? t('STATE.REFUSED')
        : t('STATE.LOAD_FAILED');
  return (
    <View testID={TID.state.error} role="alert" style={styles.box}>
      <Text style={styles.text}>{message}</Text>
      {refused ? null : (
        <Button
          testID={TID.state.retry}
          label={t('STATE.RETRY')}
          variant="secondary"
          onPress={onRetry}
        />
      )}
    </View>
  );
}

/** A list with nothing in it, or nothing matching the filter. */
export function EmptyState({ message }: { readonly message: string }) {
  return (
    <View testID={TID.state.empty} role="status" style={styles.box}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

/** The record asked for does not exist. Leads back to where it would have been listed. */
export function NotFoundState({
  message,
  backLabel,
  onBack,
}: {
  readonly message: string;
  readonly backLabel: string;
  readonly onBack: () => void;
}) {
  return (
    <View testID={TID.state.notFound} role="alert" style={styles.box}>
      <Text style={styles.text}>{message}</Text>
      <Button
        testID={TID.state.back}
        label={backLabel}
        variant="secondary"
        role="link"
        onPress={onBack}
      />
    </View>
  );
}

/** True for the read failure a record screen shows as "not found" rather than as an error. */
export const isNotFound = (error: unknown) =>
  error instanceof AppError && error.kind === 'notFound';

const styles = StyleSheet.create({
  box: { padding: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },
  text: { fontSize: 16, color: colors.text },
});
