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

import type { ClientNote } from '@/core/adapters/api/client-kyc.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { todayIso } from '@/core/forms/date';
import { formFailure } from '@/core/http/field-errors';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { EmptyState, ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { useKycMutations, useNotes } from './useClientKyc';

/** The day a note was written, in the user's calendar; `null` when the server sent no date. */
export function noteDay(createdOn: string | null): string | null {
  if (createdOn === null) return null;
  const ms = Date.parse(createdOn);
  return Number.isNaN(ms) ? null : todayIso(ms);
}

/** A client's notes: list, add, edit and delete (DOCS/test-plan/P1-07-client-kyc.md). */
export function ClientNotesScreen({ clientId }: { readonly clientId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = usePermission(CLIENT_ACCESS.createNote);
  const notes = useNotes(clientId);

  const back = (
    <Button
      testID={TID.notes.back}
      label={t('KYC.BACK')}
      variant="secondary"
      role="link"
      onPress={() => router.replace(href(`/clients/${clientId}`))}
    />
  );
  return (
    <Page testID={TID.notes.screen} title={t('KYC.NOTES')} actions={back}>
      {canCreate ? <AddNote clientId={clientId} /> : null}
      {notes.isPending ? <LoadingState /> : null}
      {notes.isError ? (
        <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />
      ) : null}
      {notes.isSuccess && notes.data.length === 0 ? (
        <EmptyState message={t('KYC.NO_NOTES')} />
      ) : null}
      {notes.data?.map((n) => (
        <NoteRow key={n.id} clientId={clientId} note={n} />
      ))}
    </Page>
  );
}

function AddNote({ clientId }: { readonly clientId: number }) {
  const { t } = useI18n();
  const { addNote } = useKycMutations(clientId);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    setError(null);
    try {
      await addNote.mutateAsync(text);
      setText('');
    } catch (e) {
      setError(formFailure(e, {}, t('FORM.SAVE_FAILED')).form);
    }
  };
  return (
    <View style={styles.form}>
      <TextField
        label={t('KYC.NEW_NOTE')}
        testID={TID.notes.text}
        value={text}
        onChangeText={setText}
        inputProps={{ multiline: true }}
      />
      {error ? (
        <Text testID={TID.notes.error} role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        testID={TID.notes.add}
        label={t('KYC.ADD_NOTE')}
        disabled={text.trim() === '' || addNote.isPending}
        onPress={() => void add()}
      />
    </View>
  );
}

function NoteRow({ clientId, note: n }: { readonly clientId: number; readonly note: ClientNote }) {
  const { t } = useI18n();
  const canUpdate = usePermission(CLIENT_ACCESS.updateNote);
  const canDelete = usePermission(CLIENT_ACCESS.deleteNote);
  const { updateNote, deleteNote } = useKycMutations(clientId);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const day = noteDay(n.createdOn);

  if (editing !== null) {
    return (
      <View testID={TID.notes.row(n.id)} style={styles.row}>
        <TextField
          label={t('KYC.EDIT_NOTE')}
          testID={TID.notes.editText}
          value={editing}
          onChangeText={setEditing}
          inputProps={{ multiline: true }}
        />
        <View style={styles.buttons}>
          <Button
            testID={TID.notes.save}
            label={t('COMMON.SAVE')}
            disabled={editing.trim() === '' || updateNote.isPending}
            onPress={() =>
              updateNote.mutate(
                { noteId: n.id, note: editing },
                { onSuccess: () => setEditing(null) },
              )
            }
          />
          <Button
            testID={TID.notes.cancelEdit}
            label={t('CLIENTS.ACTIONS.CANCEL')}
            variant="secondary"
            onPress={() => setEditing(null)}
          />
        </View>
      </View>
    );
  }
  return (
    <View testID={TID.notes.row(n.id)} style={styles.row}>
      <Text style={styles.note}>{n.note}</Text>
      <Text style={styles.detail}>{[n.createdBy, day].filter(Boolean).join(' · ')}</Text>
      {confirming ? (
        <View style={styles.buttons}>
          <Text style={styles.detail}>{t('KYC.CONFIRM_DELETE_NOTE')}</Text>
          <Button
            testID={TID.notes.confirmRemove}
            label={t('KYC.CONFIRM_DELETE')}
            disabled={deleteNote.isPending}
            onPress={() => deleteNote.mutate(n.id, { onSettled: () => setConfirming(false) })}
          />
          <Button
            testID={TID.notes.cancelRemove}
            label={t('CLIENTS.ACTIONS.CANCEL')}
            variant="secondary"
            onPress={() => setConfirming(false)}
          />
        </View>
      ) : (
        <View style={styles.buttons}>
          {canUpdate ? (
            <Button
              testID={TID.notes.edit(n.id)}
              label={t('COMMON.EDIT')}
              variant="secondary"
              onPress={() => setEditing(n.note)}
            />
          ) : null}
          {canDelete ? (
            <Button
              testID={TID.notes.remove(n.id)}
              label={t('KYC.DELETE')}
              variant="secondary"
              onPress={() => setConfirming(true)}
            />
          ) : null}
        </View>
      )}
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
  note: { fontSize: 16, color: colors.text },
  detail: { fontSize: 14, color: colors.text },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  form: { gap: spacing.sm, paddingVertical: spacing.sm },
  error: { fontSize: 14, color: colors.danger },
});
