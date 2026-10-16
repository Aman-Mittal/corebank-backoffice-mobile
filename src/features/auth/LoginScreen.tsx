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

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import { AUTH_API } from '@/core/adapters/api/auth.api';
import { OidcUnsupportedError } from '@/core/adapters/api/user-details.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { STORAGE } from '@/core/adapters/storage/storage.adapter';
import { asSignOutReason } from '@/core/auth/session-store';
import { useSession } from '@/core/auth/useSession';
import { readServerConfig, writeServerConfig } from '@/core/config/runtime-config';
import { colors, MIN_TOUCH, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { loginSchema, type LoginForm } from './login-form';
import { signInErrorKey } from './sign-in-error';
import { TwoFactorStep } from './TwoFactorStep';
import { useOidcSignIn } from './useOidcSignIn';

const NOTICE_KEYS = {
  'session-expired': 'AUTH.NOTICE.SESSION_EXPIRED',
  inactivity: 'AUTH.NOTICE.INACTIVITY',
} as const;

/**
 * Sign-in: server, tenant, username and password.
 *
 * The server and tenant are saved only once sign-in succeeds; until then the typed tenant is sent
 * explicitly on the sign-in request and nothing else. A sign-out reason in the URL
 * (`?reason=session-expired`) is explained above the form; an unknown reason says nothing.
 */
export function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const storage = useAdapter(STORAGE);
  const auth = useAdapter(AUTH_API);
  const { status, store } = useSession();
  const reason = asSignOutReason(useLocalSearchParams<{ reason?: string }>().reason);
  const [failure, setFailure] = useState<string | null>(null);

  const initial = readServerConfig(storage);
  const oidc = useOidcSignIn();
  const { control, handleSubmit, formState, setValue, setFocus, getValues, reset } =
    useForm<LoginForm>({
      resolver: zodResolver(loginSchema),
      mode: 'onChange',
      defaultValues: {
        server: initial.apiBaseUrl,
        tenant: initial.tenantId,
        username: '',
        password: '',
      },
    });

  if (status === 'signedIn') return <Redirect href="/home" />;

  if (status === 'twoFactor') {
    const back = async () => {
      // Back to an empty password form; the server and tenant the user chose stay.
      reset({ ...getValues(), username: '', password: '' });
      await store.signOut();
    };
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text role="heading" aria-level={1} style={styles.title}>
            {t('APP.NAME')}
          </Text>
          <TwoFactorStep onBack={() => void back()} />
        </View>
      </ScrollView>
    );
  }

  const signInWithProvider = async () => {
    if (!oidc) return;
    setFailure(null);
    const { server, tenant } = getValues();
    try {
      writeServerConfig(storage, { apiBaseUrl: server.trim(), tenantId: tenant.trim() });
      if ((await oidc.signIn(tenant.trim())) === 'signedIn') router.replace('/home');
    } catch (error) {
      setFailure(
        error instanceof OidcUnsupportedError
          ? 'AUTH.ERRORS.OIDC_UNSUPPORTED'
          : signInErrorKey(error),
      );
    }
  };

  const submit = handleSubmit(async (form) => {
    setFailure(null);
    // The client reads the base URL per request, so it must be in place before the call.
    writeServerConfig(storage, { apiBaseUrl: form.server.trim(), tenantId: form.tenant.trim() });
    try {
      const session = await auth.signIn({
        username: form.username.trim(),
        password: form.password,
        tenantId: form.tenant.trim(),
      });
      if (session.twoFactorRequired) {
        // Not signed in yet: the second step takes over this screen (TwoFactorStep).
        await store.beginTwoFactor(session);
        return;
      }
      await store.signIn(session);
      router.replace('/home');
    } catch (error) {
      setFailure(signInErrorKey(error));
      setValue('password', '', { shouldValidate: true });
      setFocus('password');
    }
  });

  const clearFailure = () => setFailure(null);
  const disabled = !formState.isValid || formState.isSubmitting;

  return (
    <ScrollView
      testID={TID.login.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('APP.NAME')}
        </Text>
        {reason && (
          <Text testID={TID.login.notice} accessibilityRole="alert" style={styles.notice}>
            {t(NOTICE_KEYS[reason])}
          </Text>
        )}
        {oidc && (
          <>
            <Pressable
              testID={TID.login.oidc}
              role="button"
              disabled={oidc.busy}
              aria-disabled={oidc.busy}
              onPress={() => void signInWithProvider()}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{t('AUTH.OIDC_SIGN_IN', { label: oidc.label })}</Text>
            </Pressable>
            <Text style={styles.or}>{t('AUTH.OR')}</Text>
          </>
        )}
        <Field
          control={control}
          name="server"
          label={t('AUTH.SERVER')}
          testID={TID.login.server}
          onEdit={clearFailure}
          error={formState.errors.server?.message}
          inputProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            keyboardType: 'url',
            inputMode: 'url',
          }}
        />
        <Field
          control={control}
          name="tenant"
          label={t('AUTH.TENANT')}
          testID={TID.login.tenant}
          onEdit={clearFailure}
          inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
        />
        <Field
          control={control}
          name="username"
          label={t('AUTH.USERNAME')}
          testID={TID.login.username}
          onEdit={clearFailure}
          inputProps={{ autoCapitalize: 'none', autoCorrect: false, autoComplete: 'username' }}
        />
        <Field
          control={control}
          name="password"
          label={t('AUTH.PASSWORD')}
          testID={TID.login.password}
          onEdit={clearFailure}
          inputProps={{
            secureTextEntry: true,
            autoComplete: 'current-password',
            returnKeyType: 'go',
            onSubmitEditing: () => !disabled && void submit(),
          }}
        />
        {failure && (
          <Text testID={TID.login.error} accessibilityRole="alert" style={styles.error}>
            {t(failure)}
          </Text>
        )}
        <Pressable
          testID={TID.login.submit}
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: formState.isSubmitting }}
          disabled={disabled}
          onPress={() => void submit()}
          style={[styles.button, disabled && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{t('AUTH.SIGN_IN')}</Text>
        </Pressable>
        <Link
          href="/about"
          testID={TID.login.aboutLink}
          accessibilityRole="link"
          style={styles.link}
        >
          {t('ABOUT.TITLE')}
        </Link>
      </View>
    </ScrollView>
  );
}

function Field({
  control,
  name,
  label,
  testID,
  error,
  onEdit,
  inputProps,
}: {
  readonly control: Control<LoginForm>;
  readonly name: keyof LoginForm;
  readonly label: string;
  readonly testID: string;
  readonly error?: string | undefined;
  readonly onEdit: () => void;
  readonly inputProps?: TextInputProps;
}) {
  const { t } = useI18n();
  const labelId = `login-${name}-label`;
  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <TextInput
            testID={testID}
            accessibilityLabel={label}
            aria-labelledby={labelId}
            value={field.value}
            onChangeText={(text) => {
              onEdit();
              field.onChange(text);
            }}
            onBlur={field.onBlur}
            ref={field.ref}
            style={[styles.input, error ? styles.inputInvalid : null]}
            {...inputProps}
          />
        )}
      />
      {error && error !== 'AUTH.ERRORS.REQUIRED' && (
        <Text style={styles.fieldError}>{t(error)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  notice: {
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningSurface,
    color: colors.text,
  },
  field: { gap: spacing.xs },
  label: { fontSize: 14, color: colors.text },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  inputInvalid: { borderColor: colors.danger },
  fieldError: { fontSize: 13, color: colors.danger },
  error: { fontSize: 14, color: colors.danger },
  or: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
  button: {
    minHeight: MIN_TOUCH,
    marginTop: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  link: {
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    color: colors.primary,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
