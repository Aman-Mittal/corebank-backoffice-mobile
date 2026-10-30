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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAdapter } from '@/core/adapters/AdapterProvider';
import {
  CLIENT_CHARGE_API,
  type ChargeDraft,
  type ChargePayment,
} from '@/core/adapters/api/client-charge.api';

import { clientKeys } from './clients.keys';

export function useClientCharges(clientId: number) {
  const api = useAdapter(CLIENT_CHARGE_API);
  return useQuery({
    queryKey: clientKeys.charges(clientId),
    queryFn: () => api.charges(clientId),
  });
}

export function useChargeOptions(clientId: number) {
  const api = useAdapter(CLIENT_CHARGE_API);
  return useQuery({
    queryKey: clientKeys.chargeOptions(clientId),
    queryFn: () => api.chargeOptions(clientId),
  });
}

/**
 * Every write reloads the charges, so the screen shows the server's amounts, and also after a
 * refusal: another user may have paid or waived the charge first.
 */
export function useChargeMutations(clientId: number) {
  const api = useAdapter(CLIENT_CHARGE_API);
  const queryClient = useQueryClient();
  const reload = () => queryClient.invalidateQueries({ queryKey: clientKeys.charges(clientId) });
  return {
    addCharge: useMutation({
      mutationFn: (draft: ChargeDraft) => api.addCharge(clientId, draft),
      onSuccess: reload,
    }),
    payCharge: useMutation({
      mutationFn: ({ chargeId, payment }: { chargeId: number; payment: ChargePayment }) =>
        api.payCharge(clientId, chargeId, payment),
      onSettled: reload,
    }),
    waiveCharge: useMutation({
      mutationFn: (chargeId: number) => api.waiveCharge(clientId, chargeId),
      onSettled: reload,
    }),
    deleteCharge: useMutation({
      mutationFn: (chargeId: number) => api.deleteCharge(clientId, chargeId),
      onSettled: reload,
    }),
  };
}
