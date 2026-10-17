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
import type { Client } from '@/core/adapters/api/client.api';
import { CLOCK } from '@/core/adapters/clock/clock.adapter';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { isRealIsoDate, todayIso } from '@/core/forms/date';
import { formFailure } from '@/core/http/field-errors';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { TextField } from '@/ui/form/TextField';
import { DetailRow, Page } from '@/ui/Page';
import { ErrorState, isNotFound, LoadingState, NotFoundState } from '@/ui/ScreenState';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { LEGAL_FORM_KEYS, statusText } from './client-labels';
import { useActivateClient, useClient } from './useClients';

export function ClientViewScreen({ clientId }: { readonly clientId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const canActivate = usePermission(CLIENT_ACCESS.activate);
  const valid = Number.isInteger(clientId) && clientId > 0;
  const client = useClient(clientId, { enabled: valid });

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
      {canActivate && c.status === 'pending' ? <Activate key={c.id} client={c} /> : null}
    </Page>
  );
}

/** Activate, then the date it takes effect (default today), then confirm. */
function Activate({ client }: { readonly client: Client }) {
  const { t } = useI18n();
  const clock = useAdapter(CLOCK);
  const activate = useActivateClient(client.id);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => todayIso(clock.now()));
  const [error, setError] = useState<string | null>(null);
  const dateOk = isRealIsoDate(date.trim());

  if (!open) {
    return (
      <Button
        testID={TID.client.activate}
        label={t('CLIENTS.ACTIVATE')}
        onPress={() => setOpen(true)}
      />
    );
  }
  const confirm = async () => {
    setError(null);
    try {
      await activate.mutateAsync(date.trim());
    } catch (e) {
      const failure = formFailure(e, { activationDate: 'activationDate' }, t('FORM.SAVE_FAILED'));
      setError(failure.fields.activationDate ?? failure.form);
    }
  };
  return (
    <View style={styles.activate}>
      <TextField
        label={t('CLIENTS.ACTIVATION_DATE')}
        testID={TID.client.activateDate}
        value={date}
        onChangeText={setDate}
        hint={t('FORM.DATE_HINT')}
        error={dateOk ? undefined : t('FORM.DATE_INVALID')}
        inputProps={{ inputMode: 'numeric', autoCorrect: false }}
      />
      {error ? (
        <Text testID={TID.client.activateError} role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        testID={TID.client.activateConfirm}
        label={t('CLIENTS.ACTIVATE_CONFIRM')}
        disabled={!dateOk || activate.isPending}
        onPress={() => void confirm()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  activate: { gap: spacing.sm, paddingTop: spacing.sm },
  error: { fontSize: 14, color: colors.danger },
});
