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
import type {
  ChargeOption,
  ChargeStatus,
  ClientCharge,
} from '@/core/adapters/api/client-charge.api';
import { CLOCK } from '@/core/adapters/clock/clock.adapter';
import { useI18n } from '@/core/adapters/i18n/useI18n';
import { usePermission } from '@/core/auth/usePermission';
import { formatMoney, parseAmount } from '@/core/format/money';
import { isRealIsoDate, todayIso } from '@/core/forms/date';
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
import { useChargeMutations, useChargeOptions, useClientCharges } from './useClientCharges';
import { useClient } from './useClients';

const STATUS_KEYS: Record<ChargeStatus, string> = {
  outstanding: 'CHARGES.STATUS.OUTSTANDING',
  paid: 'CHARGES.STATUS.PAID',
  waived: 'CHARGES.STATUS.WAIVED',
};

/** A client's charges: list, add, pay, waive and delete (DOCS/test-plan/P1-11-client-charges.md). */
export function ClientChargesScreen({ clientId }: { readonly clientId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = usePermission(CLIENT_ACCESS.createCharge);
  const client = useClient(clientId);
  const charges = useClientCharges(clientId);
  const [adding, setAdding] = useState(false);
  // The server refuses a charge for a client who is not active.
  const active = client.data?.status === 'active';

  const back = (
    <Button
      testID={TID.charges.back}
      label={t('KYC.BACK')}
      variant="secondary"
      role="link"
      onPress={() => router.replace(href(`/clients/${clientId}`))}
    />
  );
  return (
    <Page testID={TID.charges.screen} title={t('CHARGES.TITLE')} actions={back}>
      {canCreate && active && !adding ? (
        <Button testID={TID.charges.add} label={t('CHARGES.ADD')} onPress={() => setAdding(true)} />
      ) : null}
      {adding ? <ChargeForm clientId={clientId} onDone={() => setAdding(false)} /> : null}
      {charges.isPending ? <LoadingState /> : null}
      {charges.isError ? (
        <ErrorState error={charges.error} onRetry={() => void charges.refetch()} />
      ) : null}
      {charges.isSuccess && charges.data.length === 0 ? (
        <EmptyState message={t('CHARGES.NONE')} />
      ) : null}
      {charges.data?.map((c) => (
        <ChargeRow key={c.id} clientId={clientId} charge={c} />
      ))}
    </Page>
  );
}

type Pending = 'pay' | 'waive' | 'remove' | null;

function ChargeRow({
  clientId,
  charge: c,
}: {
  readonly clientId: number;
  readonly charge: ClientCharge;
}) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const money = (n: number) => formatMoney(n, c.currency, language);

  const choose = (next: Pending) => {
    setError(null);
    setOpen(next);
  };
  return (
    <View testID={TID.charges.row(c.id)} style={styles.row}>
      <Text style={styles.title}>{c.penalty ? `${c.name} · ${t('CHARGES.PENALTY')}` : c.name}</Text>
      <Text style={styles.detail}>
        {t('CHARGES.DUE', { date: c.dueDate ?? '—' })} · {c.currency.code}
      </Text>
      <Text style={styles.detail}>
        {t('CHARGES.AMOUNTS', {
          amount: money(c.amount),
          paid: money(c.amountPaid),
          waived: money(c.amountWaived),
          outstanding: money(c.amountOutstanding),
        })}
      </Text>
      <Text testID={TID.charges.status(c.id)} style={styles.status}>
        {t(STATUS_KEYS[c.status])}
      </Text>
      {open === null ? <RowActions charge={c} onChoose={choose} /> : null}
      {open === 'pay' ? (
        <PayForm
          clientId={clientId}
          charge={c}
          onPaid={() => choose(null)}
          onCancel={() => choose(null)}
          onError={setError}
        />
      ) : null}
      {open === 'waive' || open === 'remove' ? (
        <ConfirmPanel
          clientId={clientId}
          chargeId={c.id}
          action={open}
          onDone={() => choose(null)}
          onError={setError}
        />
      ) : null}
      {error ? (
        <Text testID={TID.charges.rowError} role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** What may be done to this charge, by this user: only while something is outstanding. */
function RowActions({
  charge: c,
  onChoose,
}: {
  readonly charge: ClientCharge;
  readonly onChoose: (next: Pending) => void;
}) {
  const { t } = useI18n();
  const canPay = usePermission(CLIENT_ACCESS.payCharge);
  const canWaive = usePermission(CLIENT_ACCESS.waiveCharge);
  const canDelete = usePermission(CLIENT_ACCESS.deleteCharge);
  if (c.status !== 'outstanding') return null;
  // The server refuses to delete a charge once anything was paid or waived.
  const untouched = c.amountPaid === 0 && c.amountWaived === 0;
  return (
    <View style={styles.buttons}>
      {canPay ? (
        <Button
          testID={TID.charges.pay(c.id)}
          label={t('CHARGES.PAY')}
          variant="secondary"
          onPress={() => onChoose('pay')}
        />
      ) : null}
      {canWaive ? (
        <Button
          testID={TID.charges.waive(c.id)}
          label={t('CHARGES.WAIVE')}
          variant="secondary"
          onPress={() => onChoose('waive')}
        />
      ) : null}
      {canDelete && untouched ? (
        <Button
          testID={TID.charges.remove(c.id)}
          label={t('KYC.DELETE')}
          variant="secondary"
          onPress={() => onChoose('remove')}
        />
      ) : null}
    </View>
  );
}

/** Waive or delete, confirmed in place. A refusal leaves the panel open, with its reason. */
function ConfirmPanel({
  clientId,
  chargeId,
  action,
  onDone,
  onError,
}: {
  readonly clientId: number;
  readonly chargeId: number;
  readonly action: 'waive' | 'remove';
  readonly onDone: () => void;
  readonly onError: (message: string | null) => void;
}) {
  const { t } = useI18n();
  const { waiveCharge, deleteCharge } = useChargeMutations(clientId);
  const mutation = action === 'waive' ? waiveCharge : deleteCharge;
  const confirm = async () => {
    onError(null);
    try {
      await mutation.mutateAsync(chargeId);
      onDone();
    } catch (e) {
      onError(formFailure(e, {}, t('FORM.SAVE_FAILED')).form);
    }
  };
  return (
    <View style={styles.buttons}>
      <Text style={styles.detail}>
        {t(action === 'waive' ? 'CHARGES.CONFIRM_WAIVE' : 'CHARGES.CONFIRM_DELETE')}
      </Text>
      <Button
        testID={action === 'waive' ? TID.charges.confirmWaive : TID.charges.confirmRemove}
        label={t(action === 'waive' ? 'CHARGES.WAIVE' : 'KYC.CONFIRM_DELETE')}
        disabled={mutation.isPending}
        onPress={() => void confirm()}
      />
      <Button
        testID={TID.charges.cancelConfirm}
        label={t('COMMON.CANCEL')}
        variant="secondary"
        onPress={onDone}
      />
    </View>
  );
}

function PayForm({
  clientId,
  charge: c,
  onPaid,
  onCancel,
  onError,
}: {
  readonly clientId: number;
  readonly charge: ClientCharge;
  readonly onPaid: () => void;
  readonly onCancel: () => void;
  readonly onError: (message: string | null) => void;
}) {
  const { t } = useI18n();
  const clock = useAdapter(CLOCK);
  const { payCharge } = useChargeMutations(clientId);
  const [amount, setAmount] = useState(String(c.amountOutstanding));
  const [date, setDate] = useState(() => todayIso(clock.now()));
  const value = parseAmount(amount, c.currency.decimalPlaces);
  const dateOk = isRealIsoDate(date.trim());

  const pay = async () => {
    if (value === null) return;
    onError(null);
    try {
      await payCharge.mutateAsync({
        chargeId: c.id,
        payment: { amount: value, transactionDate: date.trim() },
      });
      onPaid();
    } catch (e) {
      onError(formFailure(e, {}, t('FORM.SAVE_FAILED')).form);
    }
  };
  return (
    <View style={styles.form}>
      <TextField
        label={t('CHARGES.PAY_AMOUNT')}
        testID={TID.charges.payAmount}
        value={amount}
        onChangeText={setAmount}
        error={value === null ? t('CHARGES.AMOUNT_INVALID') : undefined}
        inputProps={{ inputMode: 'decimal', autoCorrect: false }}
      />
      <TextField
        label={t('CHARGES.PAY_DATE')}
        testID={TID.charges.payDate}
        value={date}
        onChangeText={setDate}
        hint={t('FORM.DATE_HINT')}
        error={dateOk ? undefined : t('FORM.DATE_INVALID')}
        inputProps={{ inputMode: 'numeric', autoCorrect: false }}
      />
      <View style={styles.buttons}>
        <Button
          testID={TID.charges.paySubmit}
          label={t('CHARGES.PAY')}
          disabled={value === null || !dateOk || payCharge.isPending}
          onPress={() => void pay()}
        />
        <Button
          testID={TID.charges.payCancel}
          label={t('COMMON.CANCEL')}
          variant="secondary"
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

/** Server parameter names → the form's fields (TID.chargeForm). */
const FIELDS = { chargeId: 'charge', amount: 'amount', dueDate: 'dueDate' } as const;
type Field = (typeof FIELDS)[keyof typeof FIELDS];

function ChargeForm({
  clientId,
  onDone,
}: {
  readonly clientId: number;
  readonly onDone: () => void;
}) {
  const { t } = useI18n();
  const clock = useAdapter(CLOCK);
  const options = useChargeOptions(clientId);
  const { addCharge } = useChargeMutations(clientId);
  const [chosen, setChosen] = useState<ChargeOption | null>(null);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => todayIso(clock.now()));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const value = chosen ? parseAmount(amount, chosen.currency.decimalPlaces) : null;
  const dateOk = isRealIsoDate(dueDate.trim());

  const choose = (id: number) => {
    const option = options.data?.find((o) => o.id === id) ?? null;
    setChosen(option);
    // The amount starts at the charge's own; the user may change it.
    if (option) setAmount(String(option.amount));
  };
  const save = async () => {
    if (chosen === null || value === null) return;
    setErrors({});
    setFormError(null);
    try {
      await addCharge.mutateAsync({ chargeId: chosen.id, amount: value, dueDate: dueDate.trim() });
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
        <Text testID={TID.chargeForm.error} role="alert" style={styles.error}>
          {formError}
        </Text>
      ) : null}
      <SelectField
        label={t('CHARGES.CHARGE')}
        testID={TID.chargeForm.charge}
        options={(options.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
        value={chosen?.id ?? null}
        onChange={choose}
        placeholder={t('CHARGES.CHARGE_PLACEHOLDER')}
        error={errors.charge}
      />
      {options.isError ? (
        <Text role="alert" style={styles.error}>
          {t('CHARGES.OPTIONS_FAILED')}
        </Text>
      ) : null}
      {options.isSuccess && options.data.length === 0 ? (
        <Text style={styles.detail}>{t('CHARGES.NO_OPTIONS')}</Text>
      ) : null}
      {chosen ? (
        <>
          <TextField
            label={t('CHARGES.AMOUNT_IN', { currency: chosen.currency.code })}
            testID={TID.chargeForm.amount}
            value={amount}
            onChangeText={setAmount}
            error={errors.amount ?? (value === null ? t('CHARGES.AMOUNT_INVALID') : undefined)}
            inputProps={{ inputMode: 'decimal', autoCorrect: false }}
          />
          <TextField
            label={t('CHARGES.DUE_DATE')}
            testID={TID.chargeForm.dueDate}
            value={dueDate}
            onChangeText={setDueDate}
            hint={t('FORM.DATE_HINT')}
            error={errors.dueDate ?? (dateOk ? undefined : t('FORM.DATE_INVALID'))}
            inputProps={{ inputMode: 'numeric', autoCorrect: false }}
          />
        </>
      ) : null}
      <View style={styles.buttons}>
        <Button
          testID={TID.chargeForm.submit}
          label={t('COMMON.SAVE')}
          disabled={value === null || !dateOk || addCharge.isPending}
          onPress={() => void save()}
        />
        <Button
          testID={TID.chargeForm.cancel}
          label={t('COMMON.CANCEL')}
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
  status: { fontSize: 14, fontWeight: '600', color: colors.text },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  form: { gap: spacing.sm, paddingVertical: spacing.sm },
  error: { fontSize: 14, color: colors.danger },
});
