import { useState, useCallback } from 'react';
import { CustomField } from '../types';
import { getCustomFieldsForEntity } from '../utils/customFieldsStorage';

const CF_PREFIX = 'cf_';

export function useCustomFields(entity: CustomField['entity']) {
  const [fields] = useState<CustomField[]>(() => getCustomFieldsForEntity(entity));

  const getFieldValue = useCallback(
    (fieldId: string, data: Record<string, any>): any => {
      return data[CF_PREFIX + fieldId] ?? '';
    },
    [],
  );

  const setFieldValue = useCallback(
    (fieldId: string, value: any, data: Record<string, any>): Record<string, any> => {
      return { ...data, [CF_PREFIX + fieldId]: value };
    },
    [],
  );

  return { fields, getFieldValue, setFieldValue };
}

const INPUT_CLASS =
  'w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white';
const LABEL_CLASS = 'block text-sm font-medium text-slate-700 mb-1';

export function CustomFieldsRenderer({
  fields,
  values,
  onChange,
}: {
  fields: CustomField[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
}) {
  if (!fields.length) return null;

  return (
    <>
      {fields.map(field => {
        const val = values[CF_PREFIX + field.id] ?? field.defaultValue ?? '';

        switch (field.type) {
          case 'text':
            return (
              <div key={field.id}>
                <label className={LABEL_CLASS}>{field.label}{field.required && <span className="text-red-500 me-1">*</span>}</label>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder={field.placeholder}
                  value={val}
                  required={field.required}
                  onChange={e => onChange(field.id, e.target.value)}
                />
              </div>
            );

          case 'number':
            return (
              <div key={field.id}>
                <label className={LABEL_CLASS}>{field.label}{field.required && <span className="text-red-500 me-1">*</span>}</label>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  placeholder={field.placeholder}
                  value={val}
                  required={field.required}
                  onChange={e => onChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            );

          case 'date':
            return (
              <div key={field.id}>
                <label className={LABEL_CLASS}>{field.label}{field.required && <span className="text-red-500 me-1">*</span>}</label>
                <input
                  type="date"
                  className={INPUT_CLASS}
                  value={val}
                  required={field.required}
                  onChange={e => onChange(field.id, e.target.value)}
                />
              </div>
            );

          case 'select':
            return (
              <div key={field.id}>
                <label className={LABEL_CLASS}>{field.label}{field.required && <span className="text-red-500 me-1">*</span>}</label>
                <select
                  className={INPUT_CLASS}
                  value={val}
                  required={field.required}
                  onChange={e => onChange(field.id, e.target.value)}
                >
                  <option value="">اختر...</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );

          case 'textarea':
            return (
              <div key={field.id}>
                <label className={LABEL_CLASS}>{field.label}{field.required && <span className="text-red-500 me-1">*</span>}</label>
                <textarea
                  className={INPUT_CLASS + ' h-20'}
                  placeholder={field.placeholder}
                  value={val}
                  required={field.required}
                  onChange={e => onChange(field.id, e.target.value)}
                />
              </div>
            );

          case 'checkbox':
            return (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 rounded"
                  checked={val === true || val === 'true'}
                  onChange={e => onChange(field.id, e.target.checked)}
                />
                <label className="text-sm font-medium text-slate-700">{field.label}</label>
              </div>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
