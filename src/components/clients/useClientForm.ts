/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useClientForm.ts — Hook لإدارة حالة نموذج إضافة/تعديل الموكل.
 *
 * v2.9.2: استخراج من ClientsList.tsx (AddEditClientModal).
 *
 * يدير:
 *  - form state (ClientFormData)
 *  - updateField<K>(key, value) — تعديل حقل واحد
 *  - setForm — استبدال كامل
 *  - reset(next?) — رجوع للقيم الافتراضية (مع خيار قيمة بديلة)
 */

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { ClientFormData } from './ClientsListShared';

export const EMPTY_CLIENT_FORM: ClientFormData = {
  name: '',
  phone: '',
  nationalId: '',
  address: '',
  email: '',
  notes: '',
  fileNumber: '',
  initialPoaNumber: '',
  initialPoaOffice: '',
  initialPoaType: 'عام قضايا',
};

export interface UseClientFormResult {
  form: ClientFormData;
  setForm: Dispatch<SetStateAction<ClientFormData>>;
  updateField: <K extends keyof ClientFormData>(
    key: K,
    value: ClientFormData[K]
  ) => void;
  /**
   * يرجع الـ form إلى قيمه الافتراضية.
   * يقبل قيمة بديلة (override) لإعادة التهيئة بقيمة جديدة.
   */
  reset: (next?: ClientFormData) => void;
}

export function useClientForm(
  initial: ClientFormData = EMPTY_CLIENT_FORM
): UseClientFormResult {
  const [form, setForm] = useState<ClientFormData>(initial);

  const updateField = useCallback(
    <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback(
    (next?: ClientFormData) => {
      setForm(next ?? initial);
    },
    [initial]
  );

  return { form, setForm, updateField, reset };
}
