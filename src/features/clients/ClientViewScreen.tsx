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

import { useAdapter } from '@/core/adapters/AdapterProvider';
import type { Client, ClientCommand } from '@/core/adapters/api/client.api';
import { CLOCK } from '@/core/adapters/clock/clock.adapter';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { permissionsSatisfy } from '@/core/auth/permissions';
import { useGranted, usePermission } from '@/core/auth/usePermission';
import { isRealIsoDate, todayIso } from '@/core/forms/date';
import { formFailure } from '@/core/http/field-errors';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { SelectField } from '@/ui/form/SelectField';
import { TextField } from '@/ui/form/TextField';
import { DetailRow, Page } from '@/ui/Page';
import { ErrorState, isNotFound, LoadingState, NotFoundState } from '@/ui/ScreenState';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { ACTION_KEYS, clientActions, isReasoned, REASON_CODES } from './client-actions';
import { LEGAL_FORM_KEYS, statusText } from './client-labels';
import { useClient, useClientCommand, useClientReasons } from './useClients';

export function ClientViewScreen({ clientId }: { readonly clientId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const valid = Number.isInteger(clientId) && clientId > 0;
  const client = useClient(clientId, { enabled: valid });
  const canReadIdentifiers = usePermission(CLIENT_ACCESS.readIdentifiers);
  const canReadNotes = usePermission(CLIENT_ACCESS.readNotes);

  if (!valid || (client.isError && isNotFound(client.error))) {
    return (
      <Page testID={TID.client.screen} title={t('CLIENTS.TITLE')}>
        <NotFoundState
          message={t('CLIENTS.NOT_FOUND')}
          backLabel={t('CLIENTS.BACK')}
          onBack={() => router.replace(href('/clients'))}
        />
      </Page>
    );
  }
  if (client.isPending) return <LoadingState />;
  if (client.isError)
    return <ErrorState error={client.error} onRetry={() => void client.refetch()} />;

  const c = client.data;
  return (
    <Page testID={TID.client.screen} title={c.displayName} titleTestID={TID.client.name}>
      <DetailRow label={t('CLIENTS.ACCOUNT_NO')} testID={TID.client.accountNo}>
        {c.accountNo}
      </DetailRow>
      <DetailRow label={t('CLIENTS.STATUS_LABEL')} testID={TID.client.status}>
        {statusText(c, t)}
      </DetailRow>
      <DetailRow label={t('CLIENTS.OFFICE')} testID={TID.client.office}>
        {c.officeName}
      </DetailRow>
      <DetailRow label={t('CLIENTS.LEGAL_FORM')} testID={TID.client.legalForm}>
        {c.legalForm ? t(LEGAL_FORM_KEYS[c.legalForm]) : null}
      </DetailRow>
      <DetailRow label={t('CLIENTS.EXTERNAL_ID')} testID={TID.client.externalId}>
        {c.externalId}
      </DetailRow>
      <DetailRow label={t('CLIENTS.MOBILE')} testID={TID.client.mobile}>
        {c.mobileNo}
      </DetailRow>
      <DetailRow label={t('CLIENTS.EMAIL')} testID={TID.client.email}>
        {c.emailAddress}
      </DetailRow>
      <DetailRow label={t('CLIENTS.SUBMITTED_ON')} testID={TID.client.submittedOn}>
        {c.submittedOnDate}
      </DetailRow>
      <DetailRow label={t('CLIENTS.ACTIVATION_DATE')} testID={TID.client.activationDate}>
        {c.activationDate}
      </DetailRow>
      {c.closedOnDate ? (
        <DetailRow label={t('CLIENTS.CLOSED_ON')} testID={TID.client.closedOn}>
          {c.closedOnDate}
        </DetailRow>
      ) : null}
      <ClientActions key={c.id} client={c} />
      <View style={styles.links}>
        {canReadIdentifiers ? (
          <Button
            testID={TID.client.identifiersLink}
            label={t('KYC.IDENTIFIERS')}
            variant="secondary"
            role="link"
            onPress={() => router.push(href(`/clients/${c.id}/identifiers`))}
          />
        ) : null}
        {canReadNotes ? (
          <Button
            testID={TID.client.notesLink}
            label={t('KYC.NOTES')}
            variant="secondary"
            role="link"
            onPress={() => router.push(href(`/clients/${c.id}/notes`))}
          />
        ) : null}
      </View>
    </Page>
  );
}

/**
 * The lifecycle commands this client's status allows and the user may run, and the one panel
 * that runs them. A refusal stays on screen even when the reloaded status no longer offers the
 * command that was refused (another user acted first).
 */
function ClientActions({ client }: { readonly client: Client }) {
  const { t } = useI18n();
  const granted = useGranted();
  const run = useClientCommand(client.id);
  const [open, setOpen] = useState<ClientCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = clientActions(client.status).filter((a) =>
    permissionsSatisfy(granted, CLIENT_ACCESS[a]),
  );
  const panel = open !== null && actions.includes(open) ? open : null;

  const choose = (command: ClientCommand) => {
    setError(null);
    setOpen(command);
  };
  const submit = async (command: ClientCommand, date: string, reasonId: number | null) => {
    setError(null);
    try {
      await run.mutateAsync({ command, input: { date, reasonId } });
      // The reload (onSettled) lands before this resolves, so the next status's buttons are
      // already on screen; close only this command's panel, never one opened since.
      setOpen((current) => (current === command ? null : current));
    } catch (e) {
      setError(formFailure(e, {}, t('FORM.SAVE_FAILED')).form);
    }
  };

  if (actions.length === 0 && error === null) return null;
  return (
    <View style={styles.actions}>
      {panel === null ? (
        <View style={styles.buttons}>
          {actions.map((command) => (
            <Button
              key={command}
              testID={TID.client.action(command)}
              label={t(ACTION_KEYS[command].label)}
              variant={command === actions[0] ? 'primary' : 'secondary'}
              disabled={run.isPending}
              onPress={() => choose(command)}
            />
          ))}
        </View>
      ) : (
        <CommandPanel
          key={panel}
          command={panel}
          busy={run.isPending}
          onConfirm={(date, reasonId) => void submit(panel, date, reasonId)}
          onCancel={() => {
            setError(null);
            setOpen(null);
          }}
        />
      )}
      {error ? (
        <Text testID={TID.client.actionError} role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function CommandPanel({
  command,
  busy,
  onConfirm,
  onCancel,
}: {
  readonly command: ClientCommand;
  readonly busy: boolean;
  readonly onConfirm: (date: string, reasonId: number | null) => void;
  readonly onCancel: () => void;
}) {
  const { t } = useI18n();
  const clock = useAdapter(CLOCK);
  const reasoned = isReasoned(command);
  const reasons = useClientReasons(reasoned ? command : null);
  const [date, setDate] = useState(() => todayIso(clock.now()));
  const [reasonId, setReasonId] = useState<number | null>(null);
  const keys = ACTION_KEYS[command];
  const dateOk = isRealIsoDate(date.trim());
  const reasonOk = !reasoned || reasonId !== null;

  return (
    <View style={styles.panel}>
      <TextField
        label={t(keys.date)}
        testID={TID.client.actionDate}
        value={date}
        onChangeText={setDate}
        hint={t('FORM.DATE_HINT')}
        error={dateOk ? undefined : t('FORM.DATE_INVALID')}
        inputProps={{ inputMode: 'numeric', autoCorrect: false }}
      />
      {reasoned ? (
        <ReasonField
          code={REASON_CODES[command]}
          reasons={reasons}
          value={reasonId}
          onChange={setReasonId}
        />
      ) : null}
      <View style={styles.buttons}>
        <Button
          testID={TID.client.actionConfirm}
          label={t(keys.confirm)}
          disabled={!dateOk || !reasonOk || busy}
          onPress={() => onConfirm(date.trim(), reasoned ? reasonId : null)}
        />
        <Button
          testID={TID.client.actionCancel}
          label={t('CLIENTS.ACTIONS.CANCEL')}
          variant="secondary"
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

function ReasonField({
  code,
  reasons,
  value,
  onChange,
}: {
  readonly code: string;
  readonly reasons: ReturnType<typeof useClientReasons>;
  readonly value: number | null;
  readonly onChange: (id: number) => void;
}) {
  const { t } = useI18n();
  if (reasons.isError) {
    return (
      <Text role="alert" style={styles.error}>
        {t('CLIENTS.ACTIONS.REASONS_FAILED')}
      </Text>
    );
  }
  if (reasons.isSuccess && reasons.data.length === 0) {
    // The server requires a reason, so with none set up the command cannot be confirmed.
    return (
      <Text testID={TID.client.actionNoReasons} role="alert" style={styles.notice}>
        {t('CLIENTS.ACTIONS.NO_REASONS', { code })}
      </Text>
    );
  }
  return (
    <SelectField
      label={t('CLIENTS.ACTIONS.REASON')}
      testID={TID.client.actionReason}
      options={(reasons.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
      value={value}
      onChange={onChange}
      placeholder={t('CLIENTS.ACTIONS.REASON_PLACEHOLDER')}
    />
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, paddingTop: spacing.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.sm },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  panel: { gap: spacing.sm },
  error: { fontSize: 14, color: colors.danger },
  notice: { fontSize: 14, color: colors.text },
});
