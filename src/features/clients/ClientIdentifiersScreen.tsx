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

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ClientIdentifier, IdentifierStatus } from '@/core/adapters/api/client-kyc.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { formFailure } from '@/core/http/field-errors';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { SelectField } from '@/ui/form/SelectField';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { EmptyState, ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { useDocumentTypes, useIdentifiers, useKycMutations } from './useClientKyc';

const STATUS_KEYS: Record<IdentifierStatus, string> = {
  active: 'COMMON.ACTIVE',
  inactive: 'COMMON.INACTIVE',
  unknown: 'KYC.STATUS_UNKNOWN',
};

/** A client's identity documents: list, add and delete (DOCS/test-plan/P1-07-client-kyc.md). */
export function ClientIdentifiersScreen({ clientId }: { readonly clientId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = usePermission(CLIENT_ACCESS.createIdentifier);
  const canDelete = usePermission(CLIENT_ACCESS.deleteIdentifier);
  const identifiers = useIdentifiers(clientId);
  const [adding, setAdding] = useState(false);

  const back = (
    <Button
      testID={TID.identifiers.back}
      label={t('KYC.BACK')}
      variant="secondary"
      role="link"
      onPress={() => router.replace(href(`/clients/${clientId}`))}
    />
  );
  return (
    <Page testID={TID.identifiers.screen} title={t('KYC.IDENTIFIERS')} actions={back}>
      {canCreate && !adding ? (
        <Button
          testID={TID.identifiers.add}
          label={t('KYC.ADD_IDENTIFIER')}
          onPress={() => setAdding(true)}
        />
      ) : null}
      {adding ? <IdentifierForm clientId={clientId} onDone={() => setAdding(false)} /> : null}
      {identifiers.isPending ? <LoadingState /> : null}
      {identifiers.isError ? (
        <ErrorState error={identifiers.error} onRetry={() => void identifiers.refetch()} />
      ) : null}
      {identifiers.isSuccess && identifiers.data.length === 0 ? (
        <EmptyState message={t('KYC.NO_IDENTIFIERS')} />
      ) : null}
      {identifiers.data?.map((i) => (
        <IdentifierRow key={i.id} clientId={clientId} identifier={i} canDelete={canDelete} />
      ))}
    </Page>
  );
}

function IdentifierRow({
  clientId,
  identifier: i,
  canDelete,
}: {
  readonly clientId: number;
  readonly identifier: ClientIdentifier;
  readonly canDelete: boolean;
}) {
  const { t } = useI18n();
  const { deleteIdentifier } = useKycMutations(clientId);
  const [confirming, setConfirming] = useState(false);
  return (
    <View testID={TID.identifiers.row(i.id)} style={styles.row}>
      <Text style={styles.title}>
        {i.documentTypeName} · {i.documentKey}
      </Text>
      {i.description ? <Text style={styles.detail}>{i.description}</Text> : null}
      <Text style={styles.detail}>{t(STATUS_KEYS[i.status])}</Text>
      {canDelete && !confirming ? (
        <Button
          testID={TID.identifiers.remove(i.id)}
          label={t('KYC.DELETE')}
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      ) : null}
      {confirming ? (
        <View style={styles.buttons}>
          <Text style={styles.detail}>{t('KYC.CONFIRM_DELETE_IDENTIFIER')}</Text>
          <Button
            testID={TID.identifiers.confirmRemove}
            label={t('KYC.CONFIRM_DELETE')}
            disabled={deleteIdentifier.isPending}
            onPress={() => deleteIdentifier.mutate(i.id, { onSettled: () => setConfirming(false) })}
          />
          <Button
            testID={TID.identifiers.cancelRemove}
            label={t('CLIENTS.ACTIONS.CANCEL')}
            variant="secondary"
            onPress={() => setConfirming(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Server parameter names → the form's fields (TID.identifierForm). */
const FIELDS = {
  documentTypeId: 'type',
  documentKey: 'key',
  description: 'description',
  // The server refuses a duplicate as a domain rule on `id`, not on `documentKey`.
  'error.msg.clientIdentifier.identityKey.duplicate': 'key',
} as const;
type Field = (typeof FIELDS)[keyof typeof FIELDS];

function IdentifierForm({
  clientId,
  onDone,
}: {
  readonly clientId: number;
  readonly onDone: () => void;
}) {
  const { t } = useI18n();
  const types = useDocumentTypes(clientId, { enabled: true });
  const { addIdentifier } = useKycMutations(clientId);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const valid = typeId !== null && key.trim() !== '';

  const save = async () => {
    if (typeId === null) return;
    setErrors({});
    setFormError(null);
    try {
      await addIdentifier.mutateAsync({ documentTypeId: typeId, documentKey: key, description });
      onDone();
    } catch (e) {
      const failure = formFailure(e, FIELDS, t('FORM.SAVE_FAILED'));
      setErrors(failure.fields);
      setFormError(failure.form);
    }
  };
  return (
    <View style={styles.form}>
      {formError ? (
        <Text testID={TID.identifierForm.error} role="alert" style={styles.error}>
          {formError}
        </Text>
      ) : null}
      <SelectField
        label={t('KYC.DOCUMENT_TYPE')}
        testID={TID.identifierForm.type}
        options={(types.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
        value={typeId}
        onChange={setTypeId}
        placeholder={t('KYC.DOCUMENT_TYPE_PLACEHOLDER')}
        error={errors.type}
      />
      <TextField
        label={t('KYC.DOCUMENT_KEY')}
        testID={TID.identifierForm.key}
        value={key}
        onChangeText={setKey}
        error={errors.key}
        inputProps={{ autoCorrect: false, autoCapitalize: 'characters' }}
      />
      <TextField
        label={t('KYC.DESCRIPTION')}
        testID={TID.identifierForm.description}
        value={description}
        onChangeText={setDescription}
        error={errors.description}
      />
      <View style={styles.buttons}>
        <Button
          testID={TID.identifierForm.submit}
          label={t('COMMON.SAVE')}
          disabled={!valid || addIdentifier.isPending}
          onPress={() => void save()}
        />
        <Button
          testID={TID.identifierForm.cancel}
          label={t('CLIENTS.ACTIONS.CANCEL')}
          variant="secondary"
          onPress={onDone}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, color: colors.text },
  detail: { fontSize: 14, color: colors.text },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  form: { gap: spacing.sm, paddingVertical: spacing.sm },
  error: { fontSize: 14, color: colors.danger },
});
