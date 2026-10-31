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

import { useAdapter } from '@/core/adapters/AdapterProvider';
import type { Client, ClientStatus, TransferCommand } from '@/core/adapters/api/client.api';
import { CLOCK } from '@/core/adapters/clock/clock.adapter';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { permissionsSatisfy } from '@/core/auth/permissions';
import { useGranted } from '@/core/auth/usePermission';
import { isRealIsoDate, todayIso } from '@/core/forms/date';
import { formFailure } from '@/core/http/field-errors';
import { Button } from '@/ui/form/Button';
import { SelectField } from '@/ui/form/SelectField';
import { TextField } from '@/ui/form/TextField';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { useTransferCommand, useTransferOffices } from './useClients';

/** The transfer commands each status allows, in the order they are offered. */
const OFFERED: Record<ClientStatus, readonly TransferCommand[]> = {
  active: ['proposeTransfer', 'proposeAndAcceptTransfer'],
  transferInProgress: ['acceptTransfer', 'rejectTransfer', 'withdrawTransfer'],
  // A rejected transfer can only be withdrawn: the server refuses Accept here.
  transferOnHold: ['withdrawTransfer'],
  pending: [],
  closed: [],
  rejected: [],
  withdrawn: [],
  unknown: [],
};

export function transferActions(status: ClientStatus): readonly TransferCommand[] {
  return OFFERED[status];
}

/** Translation keys: the button, and the question a response panel asks. */
const KEYS: Record<TransferCommand, { readonly label: string; readonly confirm: string }> = {
  proposeTransfer: {
    label: 'CLIENTS.TRANSFER.PROPOSE',
    confirm: 'CLIENTS.TRANSFER.PROPOSE_CONFIRM',
  },
  proposeAndAcceptTransfer: {
    label: 'CLIENTS.TRANSFER.NOW',
    confirm: 'CLIENTS.TRANSFER.NOW_CONFIRM',
  },
  acceptTransfer: { label: 'CLIENTS.TRANSFER.ACCEPT', confirm: 'CLIENTS.TRANSFER.ACCEPT_CONFIRM' },
  rejectTransfer: { label: 'CLIENTS.TRANSFER.REJECT', confirm: 'CLIENTS.TRANSFER.REJECT_CONFIRM' },
  withdrawTransfer: {
    label: 'CLIENTS.TRANSFER.WITHDRAW',
    confirm: 'CLIENTS.TRANSFER.WITHDRAW_CONFIRM',
  },
};

const proposes = (command: TransferCommand) =>
  command === 'proposeTransfer' || command === 'proposeAndAcceptTransfer';

/**
 * Moves a client to another office (DOCS/test-plan/P1-12-client-transfer.md): propose, answer
 * or withdraw a transfer, or transfer at once. A refusal stays on screen after the reload, as
 * the lifecycle panel's does.
 */
export function ClientTransfer({ client }: { readonly client: Client }) {
  const { t } = useI18n();
  const granted = useGranted();
  const run = useTransferCommand(client.id);
  const [open, setOpen] = useState<TransferCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = transferActions(client.status).filter((a) =>
    permissionsSatisfy(granted, CLIENT_ACCESS[a]),
  );
  const panel = open !== null && actions.includes(open) ? open : null;

  const submit = async (
    command: TransferCommand,
    input: { destinationOfficeId?: number; transferDate?: string; note: string },
  ) => {
    setError(null);
    try {
      await run.mutateAsync({ command, input });
      setOpen((current) => (current === command ? null : current));
    } catch (e) {
      setError(formFailure(e, {}, t('FORM.SAVE_FAILED')).form);
    }
  };

  if (actions.length === 0 && error === null) return null;
  return (
    <View style={styles.section}>
      {panel === null ? (
        <View style={styles.buttons}>
          {actions.map((command) => (
            <Button
              key={command}
              testID={TID.client.transfer(command)}
              label={t(KEYS[command].label)}
              variant="secondary"
              disabled={run.isPending}
              onPress={() => {
                setError(null);
                setOpen(command);
              }}
            />
          ))}
        </View>
      ) : (
        <TransferPanel
          key={panel}
          command={panel}
          fromOfficeId={client.officeId}
          busy={run.isPending}
          onConfirm={(input) => void submit(panel, input)}
          onCancel={() => {
            setError(null);
            setOpen(null);
          }}
        />
      )}
      {error ? (
        <Text testID={TID.client.transferError} role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function TransferPanel({
  command,
  fromOfficeId,
  busy,
  onConfirm,
  onCancel,
}: {
  readonly command: TransferCommand;
  readonly fromOfficeId: number | null;
  readonly busy: boolean;
  readonly onConfirm: (input: {
    destinationOfficeId?: number;
    transferDate?: string;
    note: string;
  }) => void;
  readonly onCancel: () => void;
}) {
  const { t } = useI18n();
  const clock = useAdapter(CLOCK);
  const choosesOffice = proposes(command);
  const dated = command === 'proposeTransfer';
  // The server refuses a transfer to the office the client is already in.
  const offices = useTransferOffices({ enabled: choosesOffice });
  const [officeId, setOfficeId] = useState<number | null>(null);
  const [date, setDate] = useState(() => todayIso(clock.now()));
  const [note, setNote] = useState('');
  const dateOk = !dated || isRealIsoDate(date.trim());
  const ready = (!choosesOffice || officeId !== null) && dateOk;

  return (
    <View style={styles.panel}>
      {choosesOffice ? null : <Text style={styles.text}>{t(KEYS[command].confirm)}</Text>}
      {choosesOffice ? (
        <SelectField
          label={t('CLIENTS.TRANSFER.OFFICE')}
          testID={TID.client.transferOffice}
          options={(offices.data ?? [])
            .filter((o) => o.id !== fromOfficeId)
            .map((o) => ({ value: o.id, label: o.name }))}
          value={officeId}
          onChange={setOfficeId}
          placeholder={t('CLIENTS.OFFICE_PLACEHOLDER')}
        />
      ) : null}
      {dated ? (
        <TextField
          label={t('CLIENTS.TRANSFER.DATE')}
          testID={TID.client.transferDate}
          value={date}
          onChangeText={setDate}
          hint={t('FORM.DATE_HINT')}
          error={dateOk ? undefined : t('FORM.DATE_INVALID')}
          inputProps={{ inputMode: 'numeric', autoCorrect: false }}
        />
      ) : null}
      <TextField
        label={t('CLIENTS.TRANSFER.NOTE')}
        testID={TID.client.transferNote}
        value={note}
        onChangeText={setNote}
      />
      <View style={styles.buttons}>
        <Button
          testID={TID.client.transferConfirm}
          label={t(choosesOffice ? KEYS[command].confirm : KEYS[command].label)}
          disabled={!ready || busy}
          onPress={() =>
            onConfirm({
              ...(officeId === null ? {} : { destinationOfficeId: officeId }),
              ...(dated ? { transferDate: date.trim() } : {}),
              note,
            })
          }
        />
        <Button
          testID={TID.client.transferCancel}
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
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  panel: { gap: spacing.sm },
  text: { fontSize: 14, color: colors.text },
  error: { fontSize: 14, color: colors.danger },
});
