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
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { StyleSheet, Text, type TextInputProps } from 'react-native';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import type { LegalForm } from '@/core/adapters/api/client.api';
import type { Office } from '@/core/adapters/api/office.api';
import { CLOCK } from '@/core/adapters/clock/clock.adapter';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { todayIso } from '@/core/forms/date';
import { formFailure, type FormFailure } from '@/core/http/field-errors';
import { href } from '@/core/navigation/href';
import { useOffices } from '@/features/offices/useOffices';
import { Button } from '@/ui/form/Button';
import { CheckboxField } from '@/ui/form/CheckboxField';
import { SelectField } from '@/ui/form/SelectField';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import {
  CLIENT_SERVER_FIELDS,
  clientFormSchema,
  emptyClientForm,
  toClientDraft,
  type ClientFormValues,
} from './client-form';
import { LEGAL_FORM_KEYS } from './client-labels';
import { useCreateClient } from './useClients';

type Field = (typeof CLIENT_SERVER_FIELDS)[keyof typeof CLIENT_SERVER_FIELDS];
type TextFieldName = Exclude<keyof ClientFormValues, 'legalForm' | 'officeId' | 'active'>;

/** The server's legal form ids, which are also the picker's option values. */
const LEGAL_FORM_IDS: Record<LegalForm, 1 | 2> = { person: 1, entity: 2 };
const LEGAL_FORMS: Record<1 | 2, LegalForm> = { 1: 'person', 2: 'entity' };

/** Creates a client. The office picker needs the office list first. */
export function ClientFormScreen() {
  const offices = useOffices();
  if (offices.isPending) return <LoadingState />;
  if (offices.isError)
    return <ErrorState error={offices.error} onRetry={() => void offices.refetch()} />;
  return <ClientForm offices={offices.data} />;
}

function ClientForm({ offices }: { readonly offices: readonly Office[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const clock = useAdapter(CLOCK);
  const create = useCreateClient();
  const [server, setServer] = useState<FormFailure<Field>>({ fields: {}, form: null });

  const { control, handleSubmit, formState } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    mode: 'onChange',
    defaultValues: emptyClientForm(todayIso(clock.now())),
  });
  const legalForm = useWatch({ control, name: 'legalForm' });
  const active = useWatch({ control, name: 'active' });

  const errorOf = (field: Field) => {
    const own = formState.errors[field]?.message;
    return server.fields[field] ?? (own ? t(own) : undefined);
  };
  const edited = (field: Field) => {
    if (server.fields[field])
      setServer((s) => ({ ...s, fields: { ...s.fields, [field]: undefined } }));
  };

  const submit = handleSubmit(async (values) => {
    setServer({ fields: {}, form: null });
    try {
      const id = await create.mutateAsync(toClientDraft(clientFormSchema.parse(values)));
      router.replace(href(`/clients/${id}`));
    } catch (error) {
      setServer(formFailure(error, CLIENT_SERVER_FIELDS, t('FORM.SAVE_FAILED')));
    }
  });

  const text = (
    name: TextFieldName,
    label: string,
    testID: string,
    opts: { hint?: string; inputProps?: TextInputProps } = {},
  ) => (
    <TextInputController
      control={control}
      name={name}
      label={label}
      testID={testID}
      error={errorOf(name)}
      onEdit={() => edited(name)}
      {...opts}
    />
  );
  const dateProps = {
    hint: t('FORM.DATE_HINT'),
    inputProps: { inputMode: 'numeric', autoCorrect: false } satisfies TextInputProps,
  };

  return (
    <Page testID={TID.clientForm.screen} title={t('CLIENTS.NEW_TITLE')}>
      <Controller
        control={control}
        name="legalForm"
        render={({ field }) => (
          <SelectField<1 | 2>
            label={t('CLIENTS.LEGAL_FORM')}
            testID={TID.clientForm.legalForm}
            placeholder={t('CLIENTS.PERSON')}
            options={[
              { value: 1, label: t(LEGAL_FORM_KEYS.person) },
              { value: 2, label: t(LEGAL_FORM_KEYS.entity) },
            ]}
            value={LEGAL_FORM_IDS[field.value]}
            onChange={(v) => field.onChange(LEGAL_FORMS[v])}
            error={errorOf('legalForm')}
          />
        )}
      />
      <Controller
        control={control}
        name="officeId"
        render={({ field }) => (
          <SelectField
            label={t('CLIENTS.OFFICE')}
            testID={TID.clientForm.office}
            placeholder={t('CLIENTS.OFFICE_PLACEHOLDER')}
            options={offices.map((o) => ({ value: o.id, label: o.name }))}
            value={field.value}
            onChange={(v) => {
              edited('officeId');
              field.onChange(v);
            }}
            error={errorOf('officeId')}
          />
        )}
      />
      {legalForm === 'person' ? (
        <>
          {text('firstname', t('CLIENTS.FIRSTNAME'), TID.clientForm.firstname)}
          {text('middlename', t('CLIENTS.MIDDLENAME'), TID.clientForm.middlename)}
          {text('lastname', t('CLIENTS.LASTNAME'), TID.clientForm.lastname)}
        </>
      ) : (
        text('fullname', t('CLIENTS.FULLNAME'), TID.clientForm.fullname)
      )}
      {text('submittedOnDate', t('CLIENTS.SUBMITTED_ON'), TID.clientForm.submittedOn, dateProps)}
      <Controller
        control={control}
        name="active"
        render={({ field }) => (
          <CheckboxField
            label={t('CLIENTS.ACTIVE')}
            testID={TID.clientForm.active}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {active
        ? text(
            'activationDate',
            t('CLIENTS.ACTIVATION_DATE'),
            TID.clientForm.activationDate,
            dateProps,
          )
        : null}
      {text('externalId', t('CLIENTS.EXTERNAL_ID'), TID.clientForm.externalId, {
        inputProps: { autoCapitalize: 'none', autoCorrect: false },
      })}
      {text('mobileNo', t('CLIENTS.MOBILE'), TID.clientForm.mobile, {
        inputProps: { inputMode: 'tel', autoComplete: 'tel' },
      })}
      {text('emailAddress', t('CLIENTS.EMAIL'), TID.clientForm.email, {
        inputProps: { inputMode: 'email', autoCapitalize: 'none', autoComplete: 'email' },
      })}
      {server.form ? (
        <Text testID={TID.clientForm.error} role="alert" style={styles.error}>
          {server.form}
        </Text>
      ) : null}
      <Button
        testID={TID.clientForm.submit}
        label={t('COMMON.SAVE')}
        disabled={!formState.isValid || formState.isSubmitting}
        onPress={() => void submit()}
      />
    </Page>
  );
}

function TextInputController({
  control,
  name,
  label,
  testID,
  error,
  onEdit,
  hint,
  inputProps,
}: {
  readonly control: Control<ClientFormValues>;
  readonly name: TextFieldName;
  readonly label: string;
  readonly testID: string;
  readonly error: string | undefined;
  readonly onEdit: () => void;
  readonly hint?: string;
  readonly inputProps?: TextInputProps;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          label={label}
          testID={testID}
          value={field.value}
          onChangeText={(v) => {
            onEdit();
            field.onChange(v);
          }}
          onBlur={field.onBlur}
          error={error}
          {...(hint ? { hint } : {})}
          {...(inputProps ? { inputProps } : {})}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 14, color: colors.danger },
});
