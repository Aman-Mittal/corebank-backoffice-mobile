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
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import type { Office } from '@/core/adapters/api/office.api';
import { CLOCK } from '@/core/adapters/clock/clock.adapter';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { todayIso } from '@/core/forms/date';
import { formFailure, type FormFailure } from '@/core/http/field-errors';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { SelectField } from '@/ui/form/SelectField';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { ErrorState, isNotFound, LoadingState, NotFoundState } from '@/ui/ScreenState';
import { colors } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import {
  OFFICE_SERVER_FIELDS,
  officeCreateSchema,
  officeFormSchema,
  toOfficeDraft,
  type OfficeFormValues,
} from './office-form';
import { useOffice } from './useOffice';
import { useCreateOffice, useOffices, useUpdateOffice } from './useOffices';

type Field = (typeof OFFICE_SERVER_FIELDS)[keyof typeof OFFICE_SERVER_FIELDS];

/**
 * Creates an office (`officeId` absent) or edits one. Editing shows the parent but cannot change
 * it: `PUT /offices/{id}` does not move an office.
 */
export function OfficeFormScreen({ officeId }: { readonly officeId?: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = officeId !== undefined;
  const existing = useOffice(officeId ?? 0, { enabled: editing });
  const offices = useOffices({ enabled: !editing });
  const title = t(editing ? 'OFFICES.EDIT_TITLE' : 'OFFICES.NEW_TITLE');

  const source = editing ? existing : offices;
  if (editing && existing.isError && isNotFound(existing.error)) {
    return (
      <Page testID={TID.officeForm.screen} title={title}>
        <NotFoundState
          message={t('OFFICES.NOT_FOUND')}
          backLabel={t('OFFICES.BACK')}
          onBack={() => router.replace(href('/organization/offices'))}
        />
      </Page>
    );
  }
  if (source.isPending) return <LoadingState />;
  if (source.isError)
    return <ErrorState error={source.error} onRetry={() => void source.refetch()} />;

  return (
    <OfficeForm
      key={editing ? `edit-${officeId}` : 'new'}
      title={title}
      office={editing ? (existing.data ?? null) : null}
      offices={offices.data ?? []}
    />
  );
}

function OfficeForm({
  title,
  office,
  offices,
}: {
  readonly title: string;
  readonly office: Office | null;
  readonly offices: readonly Office[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const clock = useAdapter(CLOCK);
  const create = useCreateOffice();
  const update = useUpdateOffice(office?.id ?? 0);
  const [server, setServer] = useState<FormFailure<Field>>({ fields: {}, form: null });

  const head = offices.find((o) => o.parentId === null);
  const { control, handleSubmit, formState } = useForm<OfficeFormValues>({
    resolver: zodResolver(office ? officeFormSchema : officeCreateSchema),
    mode: 'onChange',
    defaultValues: {
      name: office?.name ?? '',
      parentId: office ? office.parentId : (head?.id ?? null),
      openingDate: office?.openingDate ?? todayIso(clock.now()),
      externalId: office?.externalId ?? '',
    },
  });

  const parentOptions = office
    ? office.parentId === null
      ? []
      : [{ value: office.parentId, label: office.parentName ?? String(office.parentId) }]
    : offices.map((o) => ({ value: o.id, label: o.name }));

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
    const draft = toOfficeDraft(officeFormSchema.parse(values));
    try {
      if (office) {
        // The parent is shown, not sent: `PUT /offices/{id}` does not move an office.
        await update.mutateAsync({
          name: draft.name,
          openingDate: draft.openingDate,
          externalId: draft.externalId ?? null,
        });
        // Back to the page the edit was opened from, not a second copy of it on the stack.
        router.dismissTo(href(`/organization/offices/${office.id}`));
      } else {
        const id = await create.mutateAsync(draft);
        router.replace(href(`/organization/offices/${id}`));
      }
    } catch (error) {
      setServer(formFailure(error, OFFICE_SERVER_FIELDS, t('FORM.SAVE_FAILED')));
    }
  });

  return (
    <Page testID={TID.officeForm.screen} title={title}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label={t('OFFICES.NAME')}
            testID={TID.officeForm.name}
            value={field.value}
            onChangeText={(v) => {
              edited('name');
              field.onChange(v);
            }}
            onBlur={field.onBlur}
            error={errorOf('name')}
          />
        )}
      />
      <Controller
        control={control}
        name="parentId"
        render={({ field }) => (
          <SelectField
            label={t('OFFICES.PARENT')}
            testID={TID.officeForm.parent}
            placeholder={office ? '—' : t('OFFICES.PARENT_PLACEHOLDER')}
            options={parentOptions}
            value={field.value}
            onChange={(v) => {
              edited('parentId');
              field.onChange(v);
            }}
            disabled={office !== null}
            error={errorOf('parentId')}
          />
        )}
      />
      <Controller
        control={control}
        name="openingDate"
        render={({ field }) => (
          <TextField
            label={t('OFFICES.OPENING_DATE')}
            testID={TID.officeForm.openingDate}
            value={field.value}
            onChangeText={(v) => {
              edited('openingDate');
              field.onChange(v);
            }}
            onBlur={field.onBlur}
            hint={t('FORM.DATE_HINT')}
            error={errorOf('openingDate')}
            inputProps={{ inputMode: 'numeric', autoCorrect: false }}
          />
        )}
      />
      <Controller
        control={control}
        name="externalId"
        render={({ field }) => (
          <TextField
            label={t('OFFICES.EXTERNAL_ID')}
            testID={TID.officeForm.externalId}
            value={field.value}
            onChangeText={(v) => {
              edited('externalId');
              field.onChange(v);
            }}
            onBlur={field.onBlur}
            error={errorOf('externalId')}
            inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
          />
        )}
      />
      {server.form ? (
        <Text testID={TID.officeForm.error} role="alert" style={styles.error}>
          {server.form}
        </Text>
      ) : null}
      <Button
        testID={TID.officeForm.submit}
        label={t('COMMON.SAVE')}
        disabled={!formState.isValid || formState.isSubmitting}
        onPress={() => void submit()}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 14, color: colors.danger },
});
