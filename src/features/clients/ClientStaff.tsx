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
import { StyleSheet, Text, View } from 'react-native';

import type { Client } from '@/core/adapters/api/client.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { formFailure } from '@/core/http/field-errors';
import { Button } from '@/ui/form/Button';
import { SelectField } from '@/ui/form/SelectField';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { useStaffCommand, useStaffOptions } from './useClients';

type Mode = 'idle' | 'assigning' | 'unassigning';

/**
 * Assigns and unassigns a client's loan officer (DOCS/test-plan/P1-08-client-staff.md). Offered
 * only while the client is serviced: a rejected, withdrawn or closed client has no officer to
 * change.
 */
export function ClientStaff({ client }: { readonly client: Client }) {
  const { t } = useI18n();
  const canAssign = usePermission(CLIENT_ACCESS.assignStaff);
  const canUnassign = usePermission(CLIENT_ACCESS.unassignStaff);
  const run = useStaffCommand(client.id);
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState<string | null>(null);
  const serviced = client.status === 'pending' || client.status === 'active';
  const assigned = client.staffId;

  const send = async (assign: boolean, staffId: number) => {
    setError(null);
    try {
      await run.mutateAsync({ assign, staffId });
      setMode('idle');
    } catch (e) {
      setError(formFailure(e, {}, t('FORM.SAVE_FAILED')).form);
    }
  };

  if (!serviced || (!canAssign && !(canUnassign && assigned !== null))) return null;
  return (
    <View style={styles.section}>
      {mode === 'idle' ? (
        <View style={styles.buttons}>
          {canAssign ? (
            <Button
              testID={TID.client.assignStaff}
              label={t('CLIENTS.STAFF.ASSIGN')}
              variant="secondary"
              disabled={run.isPending}
              onPress={() => setMode('assigning')}
            />
          ) : null}
          {canUnassign && assigned !== null ? (
            <Button
              testID={TID.client.unassignStaff}
              label={t('CLIENTS.STAFF.UNASSIGN')}
              variant="secondary"
              disabled={run.isPending}
              onPress={() => setMode('unassigning')}
            />
          ) : null}
        </View>
      ) : null}
      {mode === 'assigning' ? (
        <AssignPanel
          officeId={client.officeId}
          current={assigned}
          busy={run.isPending}
          onConfirm={(staffId) => void send(true, staffId)}
          onCancel={() => setMode('idle')}
        />
      ) : null}
      {mode === 'unassigning' && assigned !== null ? (
        <View style={styles.buttons}>
          <Text style={styles.text}>
            {t('CLIENTS.STAFF.CONFIRM_UNASSIGN', { name: client.staffName ?? '' })}
          </Text>
          <Button
            testID={TID.client.unassignConfirm}
            label={t('CLIENTS.STAFF.UNASSIGN')}
            disabled={run.isPending}
            onPress={() => void send(false, assigned)}
          />
          <Button
            testID={TID.client.unassignCancel}
            label={t('CLIENTS.ACTIONS.CANCEL')}
            variant="secondary"
            onPress={() => setMode('idle')}
          />
        </View>
      ) : null}
      {error ? (
        <Text testID={TID.client.staffError} role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function AssignPanel({
  officeId,
  current,
  busy,
  onConfirm,
  onCancel,
}: {
  readonly officeId: number | null;
  readonly current: number | null;
  readonly busy: boolean;
  readonly onConfirm: (staffId: number) => void;
  readonly onCancel: () => void;
}) {
  const { t } = useI18n();
  const options = useStaffOptions(officeId);
  const [staffId, setStaffId] = useState<number | null>(current);
  const none = options.isSuccess && options.data.length === 0;
  return (
    <View style={styles.panel}>
      {none ? (
        <Text testID={TID.client.staffNone} role="alert" style={styles.text}>
          {t('CLIENTS.STAFF.NONE')}
        </Text>
      ) : (
        <SelectField
          label={t('CLIENTS.STAFF.LABEL')}
          testID={TID.client.staffSelect}
          options={(options.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
          value={staffId}
          onChange={setStaffId}
          placeholder={t('CLIENTS.STAFF.PLACEHOLDER')}
        />
      )}
      <View style={styles.buttons}>
        <Button
          testID={TID.client.staffConfirm}
          label={t('CLIENTS.STAFF.ASSIGN_CONFIRM')}
          disabled={staffId === null || none || busy}
          onPress={() => {
            if (staffId !== null) onConfirm(staffId);
          }}
        />
        <Button
          testID={TID.client.staffCancel}
          label={t('CLIENTS.ACTIONS.CANCEL')}
          variant="secondary"
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, paddingTop: spacing.sm },
  panel: { gap: spacing.sm },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  text: { fontSize: 14, color: colors.text },
  error: { fontSize: 14, color: colors.danger },
});
