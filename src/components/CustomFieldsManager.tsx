import React, { useState, useEffect } from 'react';
import { Settings2, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Edit2, Check, X } from 'lucide-react';
import { CustomField, CustomFieldType, CustomFieldOption } from '../types';
import { loadCustomFields, saveCustomFields, addCustomField, updateCustomField, deleteCustomField } from '../utils/customFieldsStorage';
import { showAlert } from '../utils/dialogs';
import { useConfirm } from '../contexts/ConfirmContext';

const ENTITY_LABELS: Record<string, string> = {
  case: 'القضايا', client: 'العملاء', session: 'الجلسات', transaction: 'المعاملات المالية',
  deadline: 'المواعيد القانونية', task: 'المهام', bailiff: 'أوراق المحضرين', execution: 'التنفيذات',
  note: 'الملاحظات', opponent: 'الخصوم',
};

const TYPE_LABELS: Record<string, string> = {
  text: 'نص', number: 'رقم', date: 'تاريخ', select: 'قائمة منسدلة', textarea: 'نص طويل', checkbox: 'مربع اختيار',
};

const EMPTY_FORM: Omit<CustomField, 'id' | 'createdAt' | 'sortOrder'> = {
  label: '', type: 'text', entity: 'case', placeholder: '', required: false, defaultValue: '', options: [],
};

export default function CustomFieldsManager() {
  const confirm = useConfirm();
  const [fields, setFields] = useState<CustomField[]>(() => loadCustomFields());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  useEffect(() => { saveCustomFields(fields); }, [fields]);

  const filtered = filterEntity === 'all' ? fields : fields.filter(f => f.entity === filterEntity);

  const grouped = filtered.reduce<Record<string, CustomField[]>>((acc, f) => {
    (acc[f.entity] = acc[f.entity] || []).push(f);
    return acc;
  }, {});

  const handleAdd = () => {
    if (!form.label.trim()) { showAlert('اكتب اسم الحقل'); return; }
    if (form.type === 'select' && (!form.options || form.options.length === 0)) { showAlert('أضف خياراً واحداً على الأقل للقائمة المنسدلة'); return; }
    const maxOrder = Math.max(0, ...fields.filter(f => f.entity === form.entity).map(f => f.sortOrder));
    const newField: CustomField = {
      id: 'cf_' + Date.now(),
      label: form.label.trim(),
      type: form.type,
      entity: form.entity,
      placeholder: form.placeholder || undefined,
      required: form.required,
      defaultValue: form.defaultValue || undefined,
      options: form.type === 'select' ? form.options : undefined,
      sortOrder: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };
    setFields(prev => [...prev, newField]);
    setForm(EMPTY_FORM);
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    if (!form.label.trim()) { showAlert('اكتب اسم الحقل'); return; }
    const existing = fields.find(f => f.id === editingId);
    if (!existing) return;
    updateCustomField({ ...existing, label: form.label.trim(), type: form.type, entity: form.entity, placeholder: form.placeholder || undefined, required: form.required, defaultValue: form.defaultValue || undefined, options: form.type === 'select' ? form.options : undefined });
    setFields(loadCustomFields());
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (id: string, label: string) => {
    if (await confirm(`حذف الحقل "${label}"؟ لن يتم حذف أي بيانات محفوظة.`)) {
      deleteCustomField(id);
      setFields(loadCustomFields());
    }
  };

  const moveField = (id: string, dir: -1 | 1) => {
    setFields(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      const a = arr[idx], b = arr[target];
      if (a.entity !== b.entity) return prev;
      const tmpOrder = a.sortOrder; a.sortOrder = b.sortOrder; b.sortOrder = tmpOrder;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const startEdit = (f: CustomField) => {
    setEditingId(f.id);
    setForm({ label: f.label, type: f.type, entity: f.entity, placeholder: f.placeholder || '', required: f.required || false, defaultValue: f.defaultValue || '', options: f.options || [] });
    setIsAdding(false);
  };

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    const val = newOptionLabel.trim();
    setForm(prev => ({ ...prev, options: [...(prev.options || []), { label: val, value: val }] }));
    setNewOptionLabel('');
  };

  const removeOption = (idx: number) => {
    setForm(prev => ({ ...prev, options: (prev.options || []).filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-indigo-600" />
          الحقول المخصصة
        </h3>
        <button onClick={() => { setIsAdding(true); setEditingId(null); setForm(EMPTY_FORM); }} className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-700 transition">
          <Plus className="w-3.5 h-3.5" /> حقل جديد
        </button>
      </div>

      <p className="text-xs text-slate-500">أضف حقولاً مخصصة لأي قسم في البرنامج. البيانات الموجودة لا تُحذف عند حذف الحقل.</p>

      {/* Filter */}
      <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-full md:w-64 text-xs p-2 rounded-xl border border-slate-200 bg-white font-bold">
        <option value="all">جميع الأقسام</option>
        {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-black text-slate-700">{editingId ? 'تعديل الحقل' : 'إضافة حقل جديد'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">اسم الحقل *</label>
              <input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 font-bold" placeholder="مثال: رقم التوكيل" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">النوع *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CustomFieldType })} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">القسم *</label>
              <select value={form.entity} onChange={e => setForm({ ...form, entity: e.target.value as CustomField['entity'] })} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold">
                {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">النص التوضيحي</label>
              <input type="text" value={form.placeholder} onChange={e => setForm({ ...form, placeholder: e.target.value })} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 font-bold" placeholder="مثال: أدخل الرقم..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">القيمة الافتراضية</label>
              <input type="text" value={form.defaultValue} onChange={e => setForm({ ...form, defaultValue: e.target.value })} className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 font-bold" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="cf-required" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} className="rounded border-slate-300 text-indigo-600" />
              <label htmlFor="cf-required" className="text-xs font-bold text-slate-600">حقل إلزامي</label>
            </div>
          </div>

          {/* Options for select type */}
          {form.type === 'select' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">الخيارات</label>
              <div className="flex gap-2">
                <input type="text" value={newOptionLabel} onChange={e => setNewOptionLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }} className="flex-1 text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-600" placeholder="اكتب الخيار واضغط Enter" />
                <button type="button" onClick={addOption} className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-lg hover:bg-indigo-200">إضافة</button>
              </div>
              {(form.options || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(form.options || []).map((opt, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      {opt.label}
                      <button type="button" onClick={() => removeOption(i)} className="text-rose-400 hover:text-rose-600"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setIsAdding(false); setEditingId(null); setForm(EMPTY_FORM); }} className="bg-slate-100 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition">إلغاء</button>
            <button onClick={editingId ? handleUpdate : handleAdd} className="bg-indigo-600 text-white text-xs font-bold px-5 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {editingId ? 'حفظ التعديل' : 'إضافة الحقل'}
            </button>
          </div>
        </div>
      )}

      {/* Fields List */}
      {Object.entries(grouped).length === 0 && !isAdding && (
        <p className="text-center text-xs text-slate-400 py-8">لا توجد حقول مخصصة بعد. اضغط "حقل جديد" للبدء.</p>
      )}

      {Object.entries(grouped).map(([entity, entityFields]: [string, CustomField[]]) => (
        <div key={entity} className="space-y-2">
          <h4 className="text-xs font-black text-indigo-700 border-b border-indigo-100 pb-1">{ENTITY_LABELS[entity] || entity}</h4>
          {entityFields.map((f) => (
            <div key={f.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5 group hover:border-indigo-200 transition">
              <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-800">{f.label}</span>
                <span className="text-[10px] text-slate-400 me-2">({TYPE_LABELS[f.type]})</span>
                {f.required && <span className="text-[10px] text-rose-500 font-bold">إلزامي</span>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => moveField(f.id, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveField(f.id, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"><ChevronDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => startEdit(f)} className="p-1 hover:bg-indigo-50 rounded text-indigo-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(f.id, f.label)} className="p-1 hover:bg-rose-50 rounded text-rose-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
