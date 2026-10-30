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

import type { CodeOption, FamilyMember, FamilyMemberDraft } from '@/core/adapters/api/family.api';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { isRealIsoDate } from '@/core/forms/date';
import { formFailure } from '@/core/http/field-errors';
import { href } from '@/core/navigation/href';
import { Button } from '@/ui/form/Button';
import { CheckboxField } from '@/ui/form/CheckboxField';
import { SelectField } from '@/ui/form/SelectField';
import { TextField } from '@/ui/form/TextField';
import { Page } from '@/ui/Page';
import { EmptyState, ErrorState, LoadingState } from '@/ui/ScreenState';
import { colors, spacing } from '@/ui/theme';

import { TID } from '../../../e2e/shared/testids';
import { CLIENT_ACCESS } from './access';
import { useFamilyMembers, useFamilyMutations, useFamilyOptions } from './useClientKyc';

/** The form's own state: text as typed, choices as ids. */
interface Values {
  readonly firstName: string;
  readonly middleName: string;
  readonly lastName: string;
  readonly relationshipId: number | null;
  readonly genderId: number | null;
  readonly maritalStatusId: number | null;
  readonly professionId: number | null;
  readonly qualification: string;
  readonly mobileNumber: string;
  readonly age: string;
  readonly dateOfBirth: string;
  readonly isDependent: boolean;
}

const EMPTY: Values = {
  firstName: '',
  middleName: '',
  lastName: '',
  relationshipId: null,
  genderId: null,
  maritalStatusId: null,
  professionId: null,
  qualification: '',
  mobileNumber: '',
  age: '',
  dateOfBirth: '',
  isDependent: false,
};

function valuesOf(m: FamilyMember): Values {
  return {
    firstName: m.firstName,
    middleName: m.middleName ?? '',
    lastName: m.lastName,
    relationshipId: m.relationshipId,
    genderId: m.genderId,
    maritalStatusId: m.maritalStatusId,
    professionId: m.professionId,
    qualification: m.qualification ?? '',
    mobileNumber: m.mobileNumber ?? '',
    age: m.age === null ? '' : String(m.age),
    dateOfBirth: m.dateOfBirth ?? '',
    isDependent: m.isDependent,
  };
}

/** The draft the adapter takes, or `null` while a required field is missing or one is invalid. */
export function toFamilyDraft(v: Values): FamilyMemberDraft | null {
  const age = v.age.trim();
  const dob = v.dateOfBirth.trim();
  if (v.firstName.trim() === '' || v.lastName.trim() === '' || v.relationshipId === null) {
    return null;
  }
  if (age !== '' && !/^\d{1,3}$/.test(age)) return null;
  if (dob !== '' && !isRealIsoDate(dob)) return null;
  return {
    firstName: v.firstName,
    middleName: v.middleName,
    lastName: v.lastName,
    relationshipId: v.relationshipId,
    genderId: v.genderId,
    maritalStatusId: v.maritalStatusId,
    professionId: v.professionId,
    qualification: v.qualification,
    mobileNumber: v.mobileNumber,
    age: age === '' ? null : Number(age),
    dateOfBirth: dob === '' ? null : dob,
    isDependent: v.isDependent,
  };
}

/** A client's family members: list, add, edit and delete (DOCS/test-plan/P1-13-family-members.md). */
export function FamilyMembersScreen({ clientId }: { readonly clientId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = usePermission(CLIENT_ACCESS.createFamilyMember);
  const members = useFamilyMembers(clientId);
  const [adding, setAdding] = useState(false);

  const back = (
    <Button
      testID={TID.family.back}
      label={t('KYC.BACK')}
      variant="secondary"
      role="link"
      onPress={() => router.replace(href(`/clients/${clientId}`))}
    />
  );
  return (
    <Page testID={TID.family.screen} title={t('FAMILY.TITLE')} actions={back}>
      {canCreate && !adding ? (
        <Button testID={TID.family.add} label={t('FAMILY.ADD')} onPress={() => setAdding(true)} />
      ) : null}
      {adding ? <MemberForm clientId={clientId} onDone={() => setAdding(false)} /> : null}
      {members.isPending ? <LoadingState /> : null}
      {members.isError ? (
        <ErrorState error={members.error} onRetry={() => void members.refetch()} />
      ) : null}
      {members.isSuccess && members.data.length === 0 ? (
        <EmptyState message={t('FAMILY.NONE')} />
      ) : null}
      {members.data?.map((m) => (
        <MemberRow key={m.id} clientId={clientId} member={m} />
      ))}
    </Page>
  );
}

function MemberRow({
  clientId,
  member: m,
}: {
  readonly clientId: number;
  readonly member: FamilyMember;
}) {
  const { t } = useI18n();
  const canUpdate = usePermission(CLIENT_ACCESS.updateFamilyMember);
  const canDelete = usePermission(CLIENT_ACCESS.deleteFamilyMember);
  const { remove } = useFamilyMutations(clientId);
  const [mode, setMode] = useState<'idle' | 'editing' | 'confirming'>('idle');

  if (mode === 'editing') {
    return (
      <View testID={TID.family.row(m.id)} style={styles.row}>
        <MemberForm clientId={clientId} member={m} onDone={() => setMode('idle')} />
      </View>
    );
  }
  const name = [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ');
  const details = [
    m.gender,
    m.profession,
    m.mobileNumber,
    m.age === null ? null : t('FAMILY.AGE_VALUE', { age: m.age }),
    m.dateOfBirth,
    m.isDependent ? t('FAMILY.DEPENDENT') : null,
  ].filter(Boolean);
  return (
    <View testID={TID.family.row(m.id)} style={styles.row}>
      <Text style={styles.title}>
        {name} · {m.relationship ?? ''}
      </Text>
      {details.length > 0 ? <Text style={styles.detail}>{details.join(' · ')}</Text> : null}
      {mode === 'confirming' ? (
        <View style={styles.buttons}>
          <Text style={styles.detail}>{t('FAMILY.CONFIRM_DELETE')}</Text>
          <Button
            testID={TID.family.confirmRemove}
            label={t('KYC.CONFIRM_DELETE')}
            disabled={remove.isPending}
            onPress={() => remove.mutate(m.id, { onSettled: () => setMode('idle') })}
          />
          <Button
            testID={TID.family.cancelRemove}
            label={t('COMMON.CANCEL')}
            variant="secondary"
            onPress={() => setMode('idle')}
          />
        </View>
      ) : (
        <View style={styles.buttons}>
          {canUpdate ? (
            <Button
              testID={TID.family.edit(m.id)}
              label={t('COMMON.EDIT')}
              variant="secondary"
              onPress={() => setMode('editing')}
            />
          ) : null}
          {canDelete ? (
            <Button
              testID={TID.family.remove(m.id)}
              label={t('KYC.DELETE')}
              variant="secondary"
              onPress={() => setMode('confirming')}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

/** Server parameter names → the form's fields (TID.familyForm). */
const FIELDS = {
  firstName: 'firstName',
  middleName: 'middleName',
  lastName: 'lastName',
  relationshipId: 'relationship',
  genderId: 'gender',
  maritalStatusId: 'maritalStatus',
  professionId: 'profession',
  qualification: 'qualification',
  mobileNumber: 'mobile',
  age: 'age',
  dateOfBirth: 'dateOfBirth',
} as const;
type Field = (typeof FIELDS)[keyof typeof FIELDS];

function MemberForm({
  clientId,
  member,
  onDone,
}: {
  readonly clientId: number;
  readonly member?: FamilyMember;
  readonly onDone: () => void;
}) {
  const { t } = useI18n();
  const options = useFamilyOptions(clientId);
  const { add, update } = useFamilyMutations(clientId);
  const [values, setValues] = useState<Values>(() => (member ? valuesOf(member) : EMPTY));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const draft = toFamilyDraft(values);
  const busy = add.isPending || update.isPending;
  const set =
    <K extends keyof Values>(key: K) =>
    (value: Values[K]) =>
      setValues((v) => ({ ...v, [key]: value }));

  const save = async () => {
    if (draft === null) return;
    setErrors({});
    setFormError(null);
    try {
      await (member ? update.mutateAsync({ memberId: member.id, draft }) : add.mutateAsync(draft));
      onDone();
    } catch (e) {
      const failure = formFailure(e, FIELDS, t('FORM.SAVE_FAILED'));
      setErrors(failure.fields);
      setFormError(failure.form);
    }
  };
  const noRelationships = options.isSuccess && options.data.relationships.length === 0;
  return (
    <View style={styles.form}>
      {formError ? (
        <Text testID={TID.familyForm.error} role="alert" style={styles.error}>
          {formError}
        </Text>
      ) : null}
      <NameFields values={values} errors={errors} set={set} />
      {noRelationships ? (
        <Text testID={TID.familyForm.noRelationships} role="alert" style={styles.detail}>
          {t('FAMILY.NO_RELATIONSHIPS')}
        </Text>
      ) : (
        <Choice
          label={t('FAMILY.RELATIONSHIP')}
          testID={TID.familyForm.relationship}
          options={options.data?.relationships}
          value={values.relationshipId}
          onChange={set('relationshipId')}
          error={errors.relationship}
        />
      )}
      <Choice
        label={t('FAMILY.GENDER')}
        testID={TID.familyForm.gender}
        options={options.data?.genders}
        value={values.genderId}
        onChange={set('genderId')}
        error={errors.gender}
      />
      <Choice
        label={t('FAMILY.MARITAL_STATUS')}
        testID={TID.familyForm.maritalStatus}
        options={options.data?.maritalStatuses}
        value={values.maritalStatusId}
        onChange={set('maritalStatusId')}
        error={errors.maritalStatus}
      />
      <Choice
        label={t('FAMILY.PROFESSION')}
        testID={TID.familyForm.profession}
        options={options.data?.professions}
        value={values.professionId}
        onChange={set('professionId')}
        error={errors.profession}
      />
      <DetailFields values={values} errors={errors} set={set} />
      <CheckboxField
        label={t('FAMILY.DEPENDENT')}
        testID={TID.familyForm.dependent}
        value={values.isDependent}
        onChange={set('isDependent')}
      />
      <View style={styles.buttons}>
        <Button
          testID={TID.familyForm.submit}
          label={t('COMMON.SAVE')}
          disabled={draft === null || busy}
          onPress={() => void save()}
        />
        <Button
          testID={TID.familyForm.cancel}
          label={t('COMMON.CANCEL')}
          variant="secondary"
          onPress={onDone}
        />
      </View>
    </View>
  );
}

type Setter = <K extends keyof Values>(key: K) => (value: Values[K]) => void;
interface FieldsProps {
  readonly values: Values;
  readonly errors: Partial<Record<Field, string>>;
  readonly set: Setter;
}

function NameFields({ values, errors, set }: FieldsProps) {
  const { t } = useI18n();
  return (
    <>
      <TextField
        label={t('FAMILY.FIRST_NAME')}
        testID={TID.familyForm.firstName}
        value={values.firstName}
        onChangeText={set('firstName')}
        error={errors.firstName}
      />
      <TextField
        label={t('FAMILY.MIDDLE_NAME')}
        testID={TID.familyForm.middleName}
        value={values.middleName}
        onChangeText={set('middleName')}
        error={errors.middleName}
      />
      <TextField
        label={t('FAMILY.LAST_NAME')}
        testID={TID.familyForm.lastName}
        value={values.lastName}
        onChangeText={set('lastName')}
        error={errors.lastName}
      />
    </>
  );
}

function DetailFields({ values, errors, set }: FieldsProps) {
  const { t } = useI18n();
  const age = values.age.trim();
  const dob = values.dateOfBirth.trim();
  return (
    <>
      <TextField
        label={t('FAMILY.QUALIFICATION')}
        testID={TID.familyForm.qualification}
        value={values.qualification}
        onChangeText={set('qualification')}
        error={errors.qualification}
      />
      <TextField
        label={t('FAMILY.MOBILE')}
        testID={TID.familyForm.mobile}
        value={values.mobileNumber}
        onChangeText={set('mobileNumber')}
        error={errors.mobile}
        inputProps={{ inputMode: 'tel' }}
      />
      <TextField
        label={t('FAMILY.AGE')}
        testID={TID.familyForm.age}
        value={values.age}
        onChangeText={set('age')}
        error={
          errors.age ?? (age === '' || /^\d{1,3}$/.test(age) ? undefined : t('FAMILY.AGE_INVALID'))
        }
        inputProps={{ inputMode: 'numeric' }}
      />
      <TextField
        label={t('FAMILY.DATE_OF_BIRTH')}
        testID={TID.familyForm.dateOfBirth}
        value={values.dateOfBirth}
        onChangeText={set('dateOfBirth')}
        hint={t('FORM.DATE_HINT')}
        error={
          errors.dateOfBirth ??
          (dob === '' || isRealIsoDate(dob) ? undefined : t('FORM.DATE_INVALID'))
        }
        inputProps={{ inputMode: 'numeric', autoCorrect: false }}
      />
    </>
  );
}

function Choice({
  label,
  testID,
  options,
  value,
  onChange,
  error,
}: {
  readonly label: string;
  readonly testID: string;
  readonly options: readonly CodeOption[] | undefined;
  readonly value: number | null;
  readonly onChange: (id: number) => void;
  readonly error: string | undefined;
}) {
  const { t } = useI18n();
  return (
    <SelectField
      label={label}
      testID={testID}
      options={(options ?? []).map((o) => ({ value: o.id, label: o.name }))}
      value={value}
      onChange={onChange}
      placeholder={t('FAMILY.CHOOSE')}
      error={error}
    />
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
