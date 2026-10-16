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

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { TWO_FACTOR_API } from '@/core/adapters/api/two-factor.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { useSession } from '@/core/auth/useSession';
import { AppError } from '@/core/http/app-error';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';

/** The server's own reason for refusing a code, when it gave one. */
function refusalReason(error: unknown): string | null {
  if (!(error instanceof AppError)) return null;
  return error.messages[0]?.message ?? (error.kind === 'domainRule' ? error.summary : null);
}

/**
 * The second sign-in step (DOCS/test-plan/P1-03-two-factor-oidc.md): choose where to send a
 * one-time code, send it, enter it. A single channel is shown, not offered as a choice; no channel
 * leaves only the way back. Everything here runs with the pending session's Basic credential,
 * which the server accepts on `/twofactor/**` only.
 */
export function TwoFactorStep({ onBack }: { readonly onBack: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const api = useAdapter(TWO_FACTOR_API);
  const { store } = useSession();
  const methods = useQuery({ queryKey: ['two-factor', 'methods'], queryFn: () => api.methods() });
  const [chosen, setChosen] = useState<string | null>(null);
  const [phase, setPhase] = useState<'choose' | 'enter'>('choose');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = methods.data ?? [];
  const method = list.find((m) => m.name === chosen) ?? list[0];

  const send = async () => {
    if (!method) return;
    setBusy(true);
    setError(null);
    try {
      await api.request(method.name);
      setPhase('enter');
    } catch {
      setError(t('TWO_FACTOR.SEND_FAILED'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      await store.completeTwoFactor(await api.validate(code.trim()));
      router.replace('/home');
    } catch (e) {
      setError(refusalReason(e) ?? t('TWO_FACTOR.INVALID'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View testID={TID.twoFactor.screen} style={styles.step}>
      <Text role="heading" aria-level={2} style={styles.title}>
        {t('TWO_FACTOR.TITLE')}
      </Text>
      {methods.isPending && <ActivityIndicator color={colors.primary} />}
      {methods.isSuccess && list.length === 0 && (
        <Text testID={TID.twoFactor.noMethods} role="alert" style={styles.text}>
          {t('TWO_FACTOR.NO_METHODS')}
        </Text>
      )}
      {method && phase === 'choose' && (
        <>
          {list.length > 1 && (
            <View role="radiogroup" aria-label={t('TWO_FACTOR.CHOOSE')} style={styles.choices}>
              <Text style={styles.text}>{t('TWO_FACTOR.CHOOSE')}</Text>
              {list.map((m) => (
                <Pressable
                  key={m.name}
                  testID={TID.twoFactor.method(m.name)}
                  role="radio"
                  aria-checked={m.name === method.name}
                  onPress={() => setChosen(m.name)}
                  style={[styles.choice, m.name === method.name && styles.choiceSelected]}
                >
                  <Text style={styles.text}>{`${m.name}: ${m.target}`}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text testID={TID.twoFactor.target} style={styles.text}>
            {t('TWO_FACTOR.SEND_TO', { target: method.target })}
          </Text>
          <Pressable
            testID={TID.twoFactor.send}
            role="button"
            disabled={busy}
            aria-disabled={busy}
            onPress={() => void send()}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>{t('TWO_FACTOR.SEND')}</Text>
          </Pressable>
        </>
      )}
      {phase === 'enter' && (
        <>
          <Text nativeID="two-factor-code-label" style={styles.text}>
            {t('TWO_FACTOR.CODE')}
          </Text>
          <TextInput
            testID={TID.twoFactor.code}
            aria-labelledby="two-factor-code-label"
            accessibilityLabel={t('TWO_FACTOR.CODE')}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="one-time-code"
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setError(null);
            }}
            onSubmitEditing={() => code.trim() && void verify()}
            style={styles.input}
          />
          <Pressable
            testID={TID.twoFactor.verify}
            role="button"
            disabled={busy || code.trim() === ''}
            aria-disabled={busy || code.trim() === ''}
            onPress={() => void verify()}
            style={[styles.primary, (busy || code.trim() === '') && styles.disabled]}
          >
            <Text style={styles.primaryText}>{t('TWO_FACTOR.VERIFY')}</Text>
          </Pressable>
        </>
      )}
      {error && (
        <Text testID={TID.twoFactor.error} role="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Pressable
        testID={TID.twoFactor.back}
        role="button"
        onPress={onBack}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>{t('TWO_FACTOR.BACK')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.text },
  choices: { gap: spacing.xs },
  choice: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceSelected: { borderColor: colors.primary, borderWidth: 2 },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 18,
    letterSpacing: 2,
    color: colors.text,
  },
  primary: {
    minHeight: MIN_TOUCH,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  secondary: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.primary, fontSize: 16, textDecorationLine: 'underline' },
  error: { fontSize: 14, color: colors.danger },
});
