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

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/core/adapters/i18n/useI18n';
import { useSession } from '@/core/auth/useSession';
import { fromSerialized } from '@/core/http/app-error';
import { formFailure } from '@/core/http/field-errors';
import { useAppDispatch, useAppSelector } from '@/state/hooks';
import { Button } from '@/ui/form/Button';
import { TextField } from '@/ui/form/TextField';
import { DetailRow, Page } from '@/ui/Page';
import { ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import {
  changePassword,
  loadPasswordPolicy,
  loadProfile,
  passwordFormClosed,
  passwordFormToggled,
  selectProfile,
} from './profile-slice';

/**
 * The signed-in user's own record, and changing their password
 * (DOCS/test-plan/P1-10-profile-state.md). The record, the policy and the change's progress are
 * in the store; the passwords being typed are not.
 */
export function ProfileScreen() {
  const { t } = useI18n();
  const session = useSession();
  const userId = session.status === 'signedIn' ? session.session.userId : null;
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);

  useEffect(() => {
    if (userId !== null) void dispatch(loadProfile(userId));
  }, [dispatch, userId]);
  // An open form is not kept for the next visit.
  useEffect(() => () => void dispatch(passwordFormClosed()), [dispatch]);

  const user = profile.userId === userId ? profile.user : null;
  const content = (() => {
    if (user) return <Details />;
    if (profile.status === 'failed' && profile.error && userId !== null) {
      return (
        <ErrorState
          error={fromSerialized(profile.error)}
          onRetry={() => void dispatch(loadProfile(userId))}
        />
      );
    }
    return <LoadingState />;
  })();
  return (
    <Page testID={TID.profile.screen} title={t('PROFILE.TITLE')}>
      {content}
    </Page>
  );
}

function Details() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { user, passwordFormOpen, passwordStatus } = useAppSelector(selectProfile);
  if (!user) return null;
  const displayName = [user.firstname, user.lastname].filter(Boolean).join(' ');
  const office =
    user.officeName === null
      ? null
      : user.officeId === null
        ? user.officeName
        : `${user.officeName} (${user.officeId})`;
  const toggle = () => {
    if (!passwordFormOpen) void dispatch(loadPasswordPolicy());
    dispatch(passwordFormToggled());
  };
  return (
    <>
      <DetailRow label={t('PROFILE.USERNAME')} testID={TID.profile.username}>
        {user.username}
      </DetailRow>
      <DetailRow label={t('PROFILE.DISPLAY_NAME')} testID={TID.profile.displayName}>
        {displayName}
      </DetailRow>
      <DetailRow label={t('PROFILE.OFFICE')} testID={TID.profile.office}>
        {office}
      </DetailRow>
      <DetailRow label={t('PROFILE.EMAIL')} testID={TID.profile.email}>
        {user.email}
      </DetailRow>
      <DetailRow label={t('PROFILE.ROLES')}>
        <View testID={TID.profile.roles} role="list" style={styles.roles}>
          {user.roles.map((role) => (
            <Text key={role} role="listitem" style={styles.role}>
              {role}
            </Text>
          ))}
        </View>
      </DetailRow>
      <Button
        testID={TID.profile.changePassword}
        label={t('PROFILE.CHANGE_PASSWORD')}
        variant="secondary"
        expanded={passwordFormOpen}
        onPress={toggle}
      />
      {passwordStatus === 'saved' ? (
        <Text testID={TID.profile.notice} role="status" style={styles.notice}>
          {t('PROFILE.PASSWORD_CHANGED')}
        </Text>
      ) : null}
      {passwordFormOpen ? <PasswordForm userId={user.id} /> : null}
    </>
  );
}

/** Mounted only while open, so closing it forgets what was typed. */
function PasswordForm({ userId }: { readonly userId: number }) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { policy, passwordStatus, passwordError } = useAppSelector(selectProfile);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const mismatch = repeatPassword.length > 0 && password !== repeatPassword;
  const saving = passwordStatus === 'saving';
  const canSave = password.length > 0 && password === repeatPassword && !saving;
  const failure =
    passwordStatus === 'failed' && passwordError
      ? formFailure(fromSerialized(passwordError), {}, t('FORM.SAVE_FAILED')).form
      : null;
  const secret = { secureTextEntry: true, autoComplete: 'new-password' as const };
  return (
    <View style={styles.form}>
      <TextField
        label={t('PROFILE.NEW_PASSWORD')}
        testID={TID.profile.newPassword}
        value={password}
        onChangeText={setPassword}
        inputProps={secret}
      />
      <TextField
        label={t('PROFILE.REPEAT_NEW_PASSWORD')}
        testID={TID.profile.repeatPassword}
        value={repeatPassword}
        onChangeText={setRepeatPassword}
        inputProps={secret}
      />
      {mismatch ? (
        <Text testID={TID.profile.mismatch} role="alert" style={styles.error}>
          {t('PROFILE.PASSWORDS_DO_NOT_MATCH')}
        </Text>
      ) : null}
      {policy ? (
        <Text testID={TID.profile.policy} style={styles.policy}>
          {t('PROFILE.PASSWORD_POLICY', { policy })}
        </Text>
      ) : null}
      {failure ? (
        <Text testID={TID.profile.error} role="alert" style={styles.error}>
          {failure}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          testID={TID.profile.cancel}
          label={t('COMMON.CANCEL')}
          variant="secondary"
          onPress={() => dispatch(passwordFormClosed())}
        />
        <Button
          testID={TID.profile.submit}
          label={t('COMMON.SAVE')}
          disabled={!canSave}
          onPress={() => void dispatch(changePassword(userId, { password, repeatPassword }))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  role: {
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  form: { gap: spacing.md, paddingTop: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { fontSize: 14, color: colors.danger },
  policy: { fontSize: 14, color: colors.textMuted },
  notice: { fontSize: 15, color: colors.success },
});
