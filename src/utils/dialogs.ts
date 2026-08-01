/**
 * dialogs.ts — دوال موحدة للنوافذ المنبثقة في Electron.
 * تحل محل alert() الأصلي الذي لا يعمل في Electron sandbox.
 */

const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

export function showAlert(message: string): Promise<void> {
  if (api?.dialogs?.alert) {
    return api.dialogs.alert(message);
  }
  window.alert(message);
  return Promise.resolve();
}

export function showConfirm(message: string): Promise<boolean> {
  if (api?.dialogs?.confirm) {
    return api.dialogs.confirm(message);
  }
  return Promise.resolve(window.confirm(message));
}
