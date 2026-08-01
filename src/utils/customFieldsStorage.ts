import { CustomField, CustomFieldsConfig } from '../types';

const STORAGE_KEY = 'lawfirm_custom_fields';

export function loadCustomFields(): CustomField[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const config: CustomFieldsConfig = JSON.parse(raw);
    return config.fields || [];
  } catch {
    return [];
  }
}

export function saveCustomFields(fields: CustomField[]): void {
  const config: CustomFieldsConfig = { fields };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function addCustomField(field: CustomField): void {
  const fields = loadCustomFields();
  fields.push(field);
  saveCustomFields(fields);
}

export function updateCustomField(updated: CustomField): void {
  const fields = loadCustomFields();
  const idx = fields.findIndex(f => f.id === updated.id);
  if (idx >= 0) {
    fields[idx] = updated;
    saveCustomFields(fields);
  }
}

export function deleteCustomField(id: string): void {
  const fields = loadCustomFields().filter(f => f.id !== id);
  saveCustomFields(fields);
}

export function getCustomFieldsForEntity(entity: CustomField['entity']): CustomField[] {
  return loadCustomFields()
    .filter(f => f.entity === entity)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
