/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * طبقة حفظ وحدة الـ Auth & RBAC.
 *
 * الترتيب: 1) ملف القرص (Electron IPC) - مضمون 100%
 *         2) localStorage - fallback للمتصفح
 *
 * يُخزّن:
 * - users.json
 * - roles.json
 * - permissions.json
 * - groups.json
 * - audit-logs.json (آخر 10,000 عملية)
 * - login-history.json (آخر 1,000 محاولة)
 * - password-policy.json
 */

import { User, Role, Permission, SecurityGroup, AuditLog, LoginHistory, PasswordPolicy } from '../types_auth';

interface ElectronAPIWindow {
  electronAPI?: {
    auth?: {
      read: (key: string) => Promise<{ success: boolean; data?: any; path?: string; error?: string }>;
      write: (key: string, data: any) => Promise<{ success: boolean; path?: string; size?: number; error?: string }>;
    };
  };
}

function getWindow(): (Window & ElectronAPIWindow) | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as (Window & ElectronAPIWindow);
}

function isElectronEnv(): boolean {
  const w = getWindow();
  return !!(w?.electronAPI?.auth);
}

const LS_PREFIX = 'auth_';
const LS_KEYS = {
  users: `${LS_PREFIX}users_v1`,
  roles: `${LS_PREFIX}roles_v1`,
  permissions: `${LS_PREFIX}permissions_v1`,
  groups: `${LS_PREFIX}groups_v1`,
  auditLogs: `${LS_PREFIX}audit_v1`,
  loginHistory: `${LS_PREFIX}login_history_v1`,
  passwordPolicy: `${LS_PREFIX}password_policy_v1`,
  session: `${LS_PREFIX}current_session_v1`,
} as const;

const KEY_TO_FILE: Record<string, string> = {
  [LS_KEYS.users]: 'users.json',
  [LS_KEYS.roles]: 'roles.json',
  [LS_KEYS.permissions]: 'permissions.json',
  [LS_KEYS.groups]: 'groups.json',
  [LS_KEYS.auditLogs]: 'audit-logs.json',
  [LS_KEYS.loginHistory]: 'login-history.json',
  [LS_KEYS.passwordPolicy]: 'password-policy.json',
};

const writeTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};
const WRITE_DEBOUNCE_MS = 300;

function scheduleDiskWrite(key: string): void {
  if (!isElectronEnv()) return;
  if (writeTimers[key]) clearTimeout(writeTimers[key]);
  writeTimers[key] = setTimeout(() => {
    writeTimers[key] = null;
    flushToDisk(key);
  }, WRITE_DEBOUNCE_MS);
}

async function flushToDisk(key: string): Promise<void> {
  if (!isElectronEnv()) return;
  const w = getWindow();
  if (!w?.electronAPI?.auth) return;
  const filename = KEY_TO_FILE[key];
  if (!filename) return;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      await w.electronAPI.auth.write(filename, JSON.parse(raw));
    }
  } catch (e) {
    console.error(`[authStorage] فشل كتابة ${filename}:`, e);
  }
}

function safeGetLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[authStorage] فشل قراءة ${key}:`, e);
    return fallback;
  }
}

function safeSetLS(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    scheduleDiskWrite(key);
  } catch (e: any) {
    console.error(`[authStorage] فشل كتابة ${key}:`, e?.name, e?.message);
  }
}

// ====================================================================
// Generic load/save
// ====================================================================

export function loadUsers(): User[]                  { return safeGetLS<User[]>(LS_KEYS.users, []); }
export function saveUsers(users: User[]): void        { safeSetLS(LS_KEYS.users, users); }
export function loadRoles(): Role[]                  { return safeGetLS<Role[]>(LS_KEYS.roles, []); }
export function saveRoles(roles: Role[]): void        { safeSetLS(LS_KEYS.roles, roles); }
export function loadPermissions(): Permission[]      { return safeGetLS<Permission[]>(LS_KEYS.permissions, []); }
export function savePermissions(perms: Permission[]): void { safeSetLS(LS_KEYS.permissions, perms); }
export function loadGroups(): SecurityGroup[]        { return safeGetLS<SecurityGroup[]>(LS_KEYS.groups, []); }
export function saveGroups(groups: SecurityGroup[]): void { safeSetLS(LS_KEYS.groups, groups); }
export function loadAuditLogs(): AuditLog[]           { return safeGetLS<AuditLog[]>(LS_KEYS.auditLogs, []); }
export function saveAuditLogs(logs: AuditLog[]): void { safeSetLS(LS_KEYS.auditLogs, logs); }
export function loadLoginHistory(): LoginHistory[]    { return safeGetLS<LoginHistory[]>(LS_KEYS.loginHistory, []); }
export function saveLoginHistory(history: LoginHistory[]): void { safeSetLS(LS_KEYS.loginHistory, history); }
export function loadPasswordPolicy(): PasswordPolicy | null {
  return safeGetLS<PasswordPolicy | null>(LS_KEYS.passwordPolicy, null);
}
export function savePasswordPolicy(policy: PasswordPolicy): void {
  safeSetLS(LS_KEYS.passwordPolicy, policy);
}

// ====================================================================
// Session (current logged-in user)
// ====================================================================

export function loadSession(): { userId: string; username: string; loginAt: string; rememberMe: boolean; expiresAt?: string } | null {
  const session = safeGetLS<{ userId: string; username: string; loginAt: string; rememberMe: boolean; expiresAt?: string }>(LS_KEYS.session, null);
  if (session && session.expiresAt && new Date(session.expiresAt) < new Date()) {
    localStorage.removeItem(LS_KEYS.session);
    return null;
  }
  return session;
}
export function saveSession(session: { userId: string; username: string; loginAt: string; rememberMe: boolean; expiresAt?: string } | null): void {
  if (session === null) {
    localStorage.removeItem(LS_KEYS.session);
  } else {
    const withExpiry = {
      ...session,
      expiresAt: session.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    safeSetLS(LS_KEYS.session, withExpiry);
  }
}

// ====================================================================
// Hydrate from disk (Electron)
// ====================================================================

export async function hydrateAllAuthFromDisk(): Promise<{
  users: number;
  roles: number;
  permissions: number;
  groups: number;
} | null> {
  if (!isElectronEnv()) return null;
  const w = getWindow();
  if (!w?.electronAPI?.auth) return null;
  try {
    // قراءة كل ملف على حدة مع timeout داخلي لضمان عدم التعليق
    const safeRead = async (file: string, key: string): Promise<{ ok: boolean; data?: any }> => {
      try {
        const result = (await Promise.race([
          w.electronAPI.auth.read(file),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout: ' + file)), 3000)),
        ])) as any;
        if (result.success && result.data) {
          localStorage.setItem(key, JSON.stringify(result.data));
          return { ok: true, data: result.data };
        }
      } catch (e: any) {
        console.warn('[authStorage] hydrate فشل في قراءة ' + file + ': ' + (e.message || e));
      }
      return { ok: false };
    };

    const loadedFlags = await Promise.all([
      safeRead('users.json', LS_KEYS.users),
      safeRead('roles.json', LS_KEYS.roles),
      safeRead('permissions.json', LS_KEYS.permissions),
      safeRead('groups.json', LS_KEYS.groups),
    ]);

    const loaded = loadedFlags.filter(Boolean).length;

    await safeRead('audit-logs.json', LS_KEYS.auditLogs);
    await safeRead('login-history.json', LS_KEYS.loginHistory);
    await safeRead('password-policy.json', LS_KEYS.passwordPolicy);

    if (loaded === 0) return null;

    // إعادة بناء الإحصائيات من الـ safeRead results (نقرأ من localStorage بعد الحفظ)
    const countAll = (key: string) => {
      try { const d = localStorage.getItem(key); return d ? JSON.parse(d).length : 0; } catch { return 0; }
    };
    return {
      users: countAll(LS_KEYS.users),
      roles: countAll(LS_KEYS.roles),
      permissions: countAll(LS_KEYS.permissions),
      groups: countAll(LS_KEYS.groups),
    };
  } catch (e) {
    console.error('[authStorage] فشل استرداد البيانات من القرص:', e);
    return null;
  }
}

// ====================================================================
// Append-only logs (rotation to avoid bloat)
// ====================================================================

const MAX_AUDIT_LOGS = 10_000;
const MAX_LOGIN_HISTORY = 1_000;

export function appendAuditLog(log: AuditLog): void {
  const logs = loadAuditLogs();
  logs.unshift(log); // الأحدث أولاً
  if (logs.length > MAX_AUDIT_LOGS) logs.length = MAX_AUDIT_LOGS;
  saveAuditLogs(logs);
}

export function appendLoginHistory(entry: LoginHistory): void {
  const history = loadLoginHistory();
  history.unshift(entry);
  if (history.length > MAX_LOGIN_HISTORY) history.length = MAX_LOGIN_HISTORY;
  saveLoginHistory(history);
}

// ====================================================================
// Diagnostics
// ====================================================================

export async function getAuthStorageDiagnostics(): Promise<{
  localStorageAvailable: boolean;
  electronDiskPath: string | null;
  usersInLocal: number;
  rolesInLocal: number;
  permsInLocal: number;
  groupsInLocal: number;
  auditLogsInLocal: number;
  loginHistoryInLocal: number;
}> {
  let lsAvailable = false;
  try {
    const testKey = '__test_auth__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    lsAvailable = true;
  } catch { lsAvailable = false; }

  return {
    localStorageAvailable: lsAvailable,
    electronDiskPath: null, // filled by main if needed
    usersInLocal: loadUsers().length,
    rolesInLocal: loadRoles().length,
    permsInLocal: loadPermissions().length,
    groupsInLocal: loadGroups().length,
    auditLogsInLocal: loadAuditLogs().length,
    loginHistoryInLocal: loadLoginHistory().length,
  };
}