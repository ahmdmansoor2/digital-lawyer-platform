/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AddEditClientModal.tsx — Modal موحّد لإضافة / تعديل الموكل.
 *
 * v2.9.2: استخراج من ClientsList.tsx (2250 سطر) لتسهيل الصيانة.
 *
 * - mode='add'  : نموذج فارغ + حقل اختياري لتوكيل أولي.
 *                 يستدعي onAddClient بـ Client جديد (يحوي التوكيل لو مُلئ).
 * - mode='edit' : يبدأ من client المُمرَّر. يستدعي onUpdateClient عند الحفظ.
 *
 * يستورد ActionBtn / ActionBtnSmall من ClientsListShared، لكن النموذج نفسه
 * لا يستخدمهما داخلياً (الأزرار submit/cancel تُعرَّف هنا).
 */

import React, { useEffect, useState } from 'react';
import { Edit, Plus, X } from 'lucide-react';
import { Client, PowerOfAttorney } from '../../types';
import { showAlert } from '../../utils/dialogs';
import { EMPTY_CLIENT_FORM, useClientForm } from './useClientForm';
import type { ClientFormData } from './ClientsListShared';
import { useCustomFields, CustomFieldsRenderer } from '../../hooks/useCustomFields';

export type AddEditClientMode = 'add' | 'edit';

export interface AddEditClientModalProps {
  mode: AddEditClientMode;
  open: boolean;
  onClose: () => void;
  /** Add mode فقط — يستلم Client جديد مُنشأ من النموذج. */
  onAddClient?: (newClient: Client) => void;
  /** Edit mode فقط — يستلم Client مُعدَّل ليتم رفعه للـ parent. */
  onUpdateClient?: (updatedClient: Client) => void;
  /** Edit mode فقط — العميل المراد تعديله. */
  client?: Client | null;
  /** الحقول المخصصة */
  customFields?: ReturnType<typeof useCustomFields>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const clientToForm = (client: Client): ClientFormData => ({
  name: client.name,
  phone: client.phone,
  nationalId: client.nationalId,
  address: client.address,
  email: client.email ?? '',
  notes: client.notes ?? '',
  fileNumber: client.fileNumber ?? '',
  initialPoaNumber: '',
  initialPoaOffice: '',
  initialPoaType: 'عام قضايا',
});

const formToClient = (
  form: ClientFormData,
  base: Client | null
): Client => {
  const poas = base?.poas ?? [];
  return {
    id: base?.id ?? '',
    name: form.name,
    phone: form.phone,
    nationalId: form.nationalId,
    address: form.address,
    email: form.email || undefined,
    notes: form.notes || undefined,
    poas,
    createdAt: base?.createdAt ?? new Date().toISOString(),
    isArchived: base?.isArchived,
    archivedAt: base?.archivedAt,
    attachments: base?.attachments,
    fileNumber: form.fileNumber || undefined,
    qrData: base?.qrData,
  };
};

// ─── Component ────────────────────────────────────────────────────────────

const AddEditClientModal = ({
  mode,
  open,
  onClose,
  onAddClient,
  onUpdateClient,
  client,
  customFields,
}: AddEditClientModalProps) => {
  // Local form state — initialized per mode.
  const { form, setForm, reset } = useClientForm(EMPTY_CLIENT_FORM);
  const [baseClient, setBaseClient] = useState<Client | null>(null);

  // Reset / hydrate the form whenever the modal opens or target changes.
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && client) {
      setBaseClient(client);
      reset(clientToForm(client));
    } else if (mode === 'add') {
      setBaseClient(null);
      reset(EMPTY_CLIENT_FORM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, client?.id]);

  if (!open) return null;

  // ─── Submit handlers ───────────────────────────────────────────────────

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.nationalId) {
      void showAlert(
        'الرجاء ملء الحقول الرئيسية: الاسم والشركاء، الهاتف، والرقم القومي المصري'
      );
      return;
    }
    if (!/^\d{14}$/.test(form.nationalId)) {
      void showAlert('الرقم القومي المصري يجب أن يتكون من 14 رقماً بالتمام (أرقام فقط)');
      return;
    }

    const poas: PowerOfAttorney[] =
      form.initialPoaNumber && form.initialPoaOffice
        ? [
            {
              id: 'poa_' + Date.now(),
              poaNumber: form.initialPoaNumber,
              office: form.initialPoaOffice,
              type: form.initialPoaType,
              date: new Date().toISOString().split('T')[0],
            },
          ]
        : [];

    const newClient: Client = {
      id: 'cl_' + Date.now(),
      name: form.name,
      phone: form.phone,
      nationalId: form.nationalId,
      address: form.address || 'القاهرة، ج.م.ع',
      email: form.email || undefined,
      poas,
      notes: form.notes || undefined,
      createdAt: new Date().toISOString(),
      fileNumber: form.fileNumber || undefined,
    };

    onAddClient?.(newClient);
    reset(EMPTY_CLIENT_FORM);
    onClose();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseClient) return;

    if (!form.name || !form.phone || !form.nationalId) {
      void showAlert('الرجاء ملء الحقول الرئيسية: الاسم، الهاتف، والرقم القومي');
      return;
    }
    if (!/^\d{14}$/.test(form.nationalId)) {
      void showAlert('الرقم القومي المصري يجب أن يتكون من 14 رقماً بالتمام (أرقام فقط)');
      return;
    }

    const updated = formToClient(form, baseClient);
    onUpdateClient?.(updated);
    onClose();
  };

  const handleCancel = () => {
    reset(mode === 'edit' && client ? clientToForm(client) : EMPTY_CLIENT_FORM);
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────

  const isAdd = mode === 'add';
  const handleSubmit = isAdd ? handleAddSubmit : handleEditSubmit;

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className={`bg-white border-b-4 border-indigo-600 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto space-y-5 text-end ${
          isAdd ? 'p-8' : 'p-6 max-h-[90vh] space-y-4'
        }`}
        id={isAdd ? 'add-client-modal' : 'edit-client-modal'}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2
            className={`font-black text-slate-900 flex items-center gap-1.5 ${
              isAdd ? 'text-[14px] md:text-base' : 'text-sm md:text-base'
            }`}
          >
            {isAdd ? (
              <>
                <Plus className="h-5 w-5 text-indigo-600" />
                تسجيل ملف موكل إضافي وعقد رسمي
              </>
            ) : (
              <>
                <Edit className="h-5 w-5 text-indigo-600" />
                تعديل سجل موكل: {form.name}
              </>
            )}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full text-slate-400 hover:text-slate-600 transition"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-xs font-medium text-slate-700"
        >
          {/* Name */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">
              {isAdd
                ? 'اسم الموكل كامل (أو اسم الشركة ويمثلها) *'
                : 'اسم الموكل كامل *'}
            </label>
            <input
              type="text"
              required
              placeholder={isAdd ? 'مثال: أحمد محمد محمود المنصوري' : undefined}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white"
              id={isAdd ? 'input-add-client-name' : 'input-edit-client-name'}
            />
          </div>

          {/* Identification + phone + fileNumber */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">الهاتف المحمول للاستقبال *</label>
              <input
                type="text"
                required
                placeholder={isAdd ? 'مثال: 01012345678' : undefined}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono text-start"
                id={isAdd ? 'input-add-client-phone' : undefined}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">الرقم القومي (أو سجل تجاري) *</label>
              <input
                type="text"
                required
                placeholder={isAdd ? '١٤ رقماً' : undefined}
                value={form.nationalId}
                onChange={(e) => setForm((p) => ({ ...p, nationalId: e.target.value }))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono text-start"
                id={isAdd ? 'input-add-client-national-id' : undefined}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">رقم الملف الورقي</label>
              <input
                type="text"
                placeholder={isAdd ? 'مثال: 0001' : 'مثال: 0001'}
                value={form.fileNumber}
                onChange={(e) => setForm((p) => ({ ...p, fileNumber: e.target.value }))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono text-start"
                id={isAdd ? 'input-add-client-file-number' : undefined}
              />
            </div>
          </div>

          {/* Address + email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-bold mb-1">
                {isAdd
                  ? 'العنوان بالتفصيل المعين للقضايا *'
                  : 'محل الإقامة المختار بالتفصيل *'}
              </label>
              <input
                type="text"
                required={!isAdd}
                placeholder={isAdd ? 'مدينة نصر، حي السفارات، عمارة ١٢ ش...' : undefined}
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white"
                id={isAdd ? 'input-add-client-address' : undefined}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">البريد الإلكتروني (اختياري)</label>
              <input
                type="email"
                placeholder="ahmed@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white text-start font-mono"
              />
            </div>
          </div>

          {/* Optional initial PoA (add mode only) */}
          {isAdd && (
            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200/50 space-y-3">
              <h3 className="font-extrabold text-[11px] text-indigo-900 border-b border-indigo-200/50 pb-1 flex items-center gap-1.5 justify-between">
                <span>إدخال التوكيل القضائي المودع حالاً (اختياري)</span>
                <span className="text-[10px] text-indigo-700">الشهر العقاري</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">رقم التوكيل</label>
                  <input
                    type="text"
                    placeholder="مثال: ١٢٣٤ / أ"
                    value={form.initialPoaNumber}
                    onChange={(e) => setForm((p) => ({ ...p, initialPoaNumber: e.target.value }))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">مكتب التوثيق الصادر منه</label>
                  <input
                    type="text"
                    placeholder="مثال: توثيق الأهرام النموذجي"
                    value={form.initialPoaOffice}
                    onChange={(e) => setForm((p) => ({ ...p, initialPoaOffice: e.target.value }))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">نوع التوكيل</label>
                  <select
                    value={form.initialPoaType}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, initialPoaType: e.target.value as ClientFormData['initialPoaType'] }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="عام قضايا">عام قضايا رسمي</option>
                    <option value="خاص قضايا">خاص قضايا</option>
                    <option value="توكيل شامل">توكيل شامل عام</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">
              {isAdd ? 'ملاحظات ووصايا الموكل' : 'ملاحظات ودفوع المكتب'}
            </label>
            <textarea
              placeholder={isAdd ? 'رجل أعمال مهتم بتصفية الشركات...' : undefined}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className={`w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white ${
                isAdd ? 'h-16' : 'h-20'
              }`}
            />
          </div>

          {customFields && customFields.fields.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">حقول إضافية</legend>
              <CustomFieldsRenderer
                fields={customFields.fields}
                values={(form as any).customFieldValues || {}}
                onChange={(fieldId, val) => setForm((p) => ({ ...p, customFieldValues: customFields.setFieldValue(fieldId, val, (p as any).customFieldValues || {}) }))}
              />
            </fieldset>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition"
            >
              {isAdd ? 'إلغاء' : 'إلغاء التعديل'}
            </button>
            <button
              type="submit"
              className="bg-slate-900 border border-indigo-500/25 text-indigo-500 hover:bg-slate-800 px-7 py-2.5 rounded-xl font-bold transition shadow-md"
              id={isAdd ? 'submit-client-btn' : 'submit-edit-client-btn'}
            >
              {isAdd ? 'تسجيل الموكل بحق' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditClientModal;
