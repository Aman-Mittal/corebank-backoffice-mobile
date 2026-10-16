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
import { Controller, useForm, type Control } from 'react-hook-form';
import { StyleSheet, Text, type TextInputProps } from 'react-native';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import type { Office } from '@/core/adapters/api/office.api';
import type { Staff } from '@/core/adapters/api/staff.api';
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
import { ErrorState, isNotFound, LoadingState, NotFoundState } from '@/ui/ScreenState';
import { colors } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import {
  STAFF_SERVER_FIELDS,
  staffFormSchema,
  toStaffDraft,
  toStaffUpdate,
  type StaffFormValues,
} from './staff-form';
import { useCreateStaff, useStaffMember, useUpdateStaff } from './useStaff';

type Field = (typeof STAFF_SERVER_FIELDS)[keyof typeof STAFF_SERVER_FIELDS];
type TextFieldName = Exclude<keyof StaffFormValues, 'officeId' | 'isLoanOfficer' | 'isActive'>;

/**
 * Creates a staff member (`staffId` absent) or edits one. Editing shows the office, email and
 * joining date but does not send them (DOCS/test-plan/P1-04-offices-staff.md).
 */
export function StaffFormScreen({ staffId }: { readonly staffId?: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = staffId !== undefined;
  const existing = useStaffMember(staffId ?? 0, { enabled: editing });
  const offices = useOffices({ enabled: !editing });
  const title = t(editing ? 'STAFF.EDIT_TITLE' : 'STAFF.NEW_TITLE');

  const source = editing ? existing : offices;
  if (editing && existing.isError && isNotFound(existing.error)) {
    return (
      <Page testID={TID.staffForm.screen} title={title}>
        <NotFoundState
          message={t('STAFF.NOT_FOUND')}
          backLabel={t('STAFF.BACK')}
          onBack={() => router.replace(href('/organization/staff'))}
        />
      </Page>
    );
  }
  if (source.isPending) return <LoadingState />;
  if (source.isError)
    return <ErrorState error={source.error} onRetry={() => void source.refetch()} />;

  return (
    <StaffForm
      key={editing ? `edit-${staffId}` : 'new'}
      title={title}
      member={editing ? (existing.data ?? null) : null}
      offices={offices.data ?? []}
    />
  );
}

function StaffForm({
  title,
  member,
  offices,
}: {
  readonly title: string;
  readonly member: Staff | null;
  readonly offices: readonly Office[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const clock = useAdapter(CLOCK);
  const create = useCreateStaff();
  const update = useUpdateStaff(member?.id ?? 0);
  const [server, setServer] = useState<FormFailure<Field>>({ fields: {}, form: null });

  const { control, handleSubmit, formState } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    mode: 'onChange',
    defaultValues: {
      officeId: member?.officeId ?? null,
      firstname: member?.firstname ?? '',
      lastname: member?.lastname ?? '',
      mobileNo: member?.mobileNo ?? '',
      emailAddress: member?.emailAddress ?? '',
      externalId: member?.externalId ?? '',
      joiningDate: member?.joiningDate ?? todayIso(clock.now()),
      isLoanOfficer: member?.isLoanOfficer ?? false,
      isActive: member?.isActive ?? true,
    },
  });

  const errorOf = (field: Field) => {
    const own = formState.errors[field]?.message;
    return server.fields[field] ?? (own ? t(own) : undefined);
  };
  const edited = (field: Field) => {
    if (server.fields[field])
      setServer((s) => ({ ...s, fields: { ...s.fields, [field]: undefined } }));
  };

  const officeOptions = member
    ? member.officeId === null
      ? []
      : [{ value: member.officeId, label: member.officeName }]
    : offices.map((o) => ({ value: o.id, label: o.name }));

  const submit = handleSubmit(async (values) => {
    setServer({ fields: {}, form: null });
    const parsed = staffFormSchema.parse(values);
    try {
      if (member) {
        await update.mutateAsync(toStaffUpdate(parsed));
        router.dismissTo(href(`/organization/staff/${member.id}`));
      } else {
        const id = await create.mutateAsync(toStaffDraft(parsed));
        router.replace(href(`/organization/staff/${id}`));
      }
    } catch (error) {
      setServer(formFailure(error, STAFF_SERVER_FIELDS, t('FORM.SAVE_FAILED')));
    }
  });

  const text = (
    name: TextFieldName,
    label: string,
    testID: string,
    opts: { readOnly?: boolean; hint?: string; inputProps?: TextInputProps } = {},
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
  return (
    <Page testID={TID.staffForm.screen} title={title}>
      <Controller
        control={control}
        name="officeId"
        render={({ field }) => (
          <SelectField
            label={t('STAFF.OFFICE')}
            testID={TID.staffForm.office}
            placeholder={t('STAFF.OFFICE_PLACEHOLDER')}
            options={officeOptions}
            value={field.value}
            onChange={(v) => {
              edited('officeId');
              field.onChange(v);
            }}
            disabled={member !== null}
            error={errorOf('officeId')}
          />
        )}
      />
      {text('firstname', t('STAFF.FIRSTNAME'), TID.staffForm.firstname)}
      {text('lastname', t('STAFF.LASTNAME'), TID.staffForm.lastname)}
      {text('mobileNo', t('STAFF.MOBILE'), TID.staffForm.mobile, {
        inputProps: { inputMode: 'tel', autoComplete: 'tel' },
      })}
      {text('emailAddress', t('STAFF.EMAIL'), TID.staffForm.email, {
        readOnly: member !== null,
        inputProps: { inputMode: 'email', autoCapitalize: 'none', autoComplete: 'email' },
      })}
      {text('externalId', t('STAFF.EXTERNAL_ID'), TID.staffForm.externalId, {
        inputProps: { autoCapitalize: 'none', autoCorrect: false },
      })}
      {text('joiningDate', t('STAFF.JOINING_DATE'), TID.staffForm.joiningDate, {
        readOnly: member !== null,
        hint: t('FORM.DATE_HINT'),
        inputProps: { inputMode: 'numeric', autoCorrect: false },
      })}
      <Controller
        control={control}
        name="isLoanOfficer"
        render={({ field }) => (
          <CheckboxField
            label={t('STAFF.LOAN_OFFICER')}
            testID={TID.staffForm.loanOfficer}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <CheckboxField
            label={t('STAFF.ACTIVE')}
            testID={TID.staffForm.active}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {server.form ? (
        <Text testID={TID.staffForm.error} role="alert" style={styles.error}>
          {server.form}
        </Text>
      ) : null}
      <Button
        testID={TID.staffForm.submit}
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
  readOnly,
  hint,
  inputProps,
}: {
  readonly control: Control<StaffFormValues>;
  readonly name: TextFieldName;
  readonly label: string;
  readonly testID: string;
  readonly error: string | undefined;
  readonly onEdit: () => void;
  readonly readOnly?: boolean;
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
          readOnly={readOnly ?? false}
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
