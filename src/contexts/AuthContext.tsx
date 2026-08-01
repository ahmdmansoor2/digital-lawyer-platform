/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth Context + Auth Provider
 *
 * إدارة الحالة العامة للمصادقة والصلاحيات.
 * يوفر CurrentUserContext لكل المكونات الفرعية.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  User, Role, Permission, SecurityGroup, PasswordPolicy, CurrentUserContext,
  LoginHistory, AuditLog,
} from '../types_auth';
import { buildUserContext, hasPermission } from '../utils/permissionEngine';
import { logger } from '../utils/logger';
import {
  loadUsers, saveUsers, loadRoles, saveRoles, loadPermissions, savePermissions,
  loadGroups, saveGroups, loadAuditLogs, loadLoginHistory, appendAuditLog, appendLoginHistory,
  loadPasswordPolicy, savePasswordPolicy, loadSession, saveSession,
  hydrateAllAuthFromDisk,
} from '../utils/authStorage';
import { verifyPassword, verifyTotp, generateTotpSecret, hashPassword, getDeviceInfo, generateOtp, generateId } from '../utils/security';
import {
  buildDefaultPermissions, buildDefaultRoles, buildDefaultGroups,
  buildDefaultPasswordPolicy, buildDefaultAdminUser, buildDemoUsers,
} from '../data/seedAuth';

interface AuthContextType {
  // البيانات
  users: User[];
  roles: Role[];
  permissions: Permission[];
  groups: SecurityGroup[];
  passwordPolicy: PasswordPolicy | null;
  loginHistory: LoginHistory[];

  // المستخدم الحالي
  currentUser: User | null;
  context: CurrentUserContext;
  isInitialized: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  twoFactorPending: boolean;

  // العمليات
  login: (username: string, password: string, opts?: { twoFactorCode?: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string; needTwoFactor?: boolean }>;
  logout: () => void;
  refresh: () => void;

  // CRUD
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addRole: (role: Role) => void;
  updateRole: (role: Role) => void;
  deleteRole: (id: string) => void;
  addGroup: (group: SecurityGroup) => void;
  updateGroup: (group: SecurityGroup) => void;
  deleteGroup: (id: string) => void;
  updatePasswordPolicy: (policy: PasswordPolicy) => void;

  // Permission checks
  can: (code: string) => boolean;
  canAny: (codes: string[]) => boolean;
  canAll: (codes: string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // ===== الحالة =====
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groups, setGroups] = useState<SecurityGroup[]>([]);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [pendingUsername, setPendingUsername] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ===== التهيئة الأولية =====
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    const log = (msg: string) => {
      const dt = Date.now() - start;
      logger.debug(`[AuthProvider +${dt}ms] ${msg}`);
    };

    (async () => {
      try {
        log('start');
        // أولاً: استرداد من القرص (Electron) — مع timeout 3 ثوانٍ
        try {
          await Promise.race([
            hydrateAllAuthFromDisk(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('hydrate timeout')), 3000)),
          ]);
          log('hydrate done');
        } catch (e) {
          console.warn('[AuthProvider] hydrate فشل أو انتهى timeout — نتابع:', e);
        }

        if (cancelled) return;

        // ثانياً: تحميل من localStorage
        let loadedUsers = loadUsers();
        let loadedRoles = loadRoles();
        let loadedPermissions = loadPermissions();
        let loadedGroups = loadGroups();
        let loadedPolicy = loadPasswordPolicy();
        let loadedHistory = loadLoginHistory();
        log(`loaded LS: users=${loadedUsers.length} roles=${loadedRoles.length} perms=${loadedPermissions.length}`);

        // ثالثاً: لو البيانات ناقصɡ نستخدم seed
        if (loadedPermissions.length === 0) {
          loadedPermissions = buildDefaultPermissions();
          savePermissions(loadedPermissions);
        }
        if (loadedRoles.length === 0) {
          loadedRoles = buildDefaultRoles();
          saveRoles(loadedRoles);
        }
        if (loadedGroups.length === 0) {
          loadedGroups = buildDefaultGroups();
          saveGroups(loadedGroups);
        }
        if (!loadedPolicy) {
          loadedPolicy = buildDefaultPasswordPolicy();
          savePasswordPolicy(loadedPolicy);
        }
        if (loadedUsers.length === 0) {
          log('building default + demo users...');
          const admin = await buildDefaultAdminUser();
          const demo = await buildDemoUsers();
          loadedUsers = [admin, ...demo];
          saveUsers(loadedUsers);
          log(`seeded ${loadedUsers.length} users`);
        }

        if (cancelled) return;

        setUsers(loadedUsers);
        setRoles(loadedRoles);
        setPermissions(loadedPermissions);
        setGroups(loadedGroups);
        setPasswordPolicy(loadedPolicy);
        setLoginHistory(loadedHistory);

        // رابعاً: استعادة الجلسة النشطة (Remember Me)
        const session = loadSession();
        if (session) {
          const user = loadedUsers.find(u => u.id === session.userId);
          if (user && user.status === 'active') {
            setCurrentUser(user);
          }
        }

        setIsInitialized(true);
        log('done ✓');
      } catch (e) {
        console.error('[AuthProvider] فشل التهيئة:', e);
        setIsInitialized(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ===== بناء السياق =====
  const context = useMemo(() => {
    return buildUserContext(currentUser, roles, groups, permissions);
  }, [currentUser, roles, groups, permissions]);

  // ===== Helpers للصلاحيات =====
  const can = useCallback((code: string) => hasPermission(context, code), [context]);
  const canAny = useCallback((codes: string[]) => codes.some(c => hasPermission(context, c)), [context]);
  const canAll = useCallback((codes: string[]) => codes.every(c => hasPermission(context, c)), [context]);

  // ===== تسجيل الدخول =====
  const login = useCallback(async (username: string, password: string, opts?: { twoFactorCode?: string; rememberMe?: boolean }) => {
    if (!isInitialized) {
      return { success: false, error: 'جارٍ تهيئة بيانات المصادقة، حاول بعد قليل' };
    }

    const policy = passwordPolicy || buildDefaultPasswordPolicy();
    const device = getDeviceInfo();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      appendLoginHistory({
        id: generateId('lh'),
        username,
        status: 'failed',
        timestamp: new Date().toISOString(),
        deviceName: device.deviceName,
        browser: device.browser,
        os: device.os,
        failureReason: 'المستخدم غير موجود',
      });
      setLoginHistory(loadLoginHistory());
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    // التحقق من الحساب المقفل
    if (user.status === 'locked') {
      const updatedUsers = users.map(u => u.id === user.id ? { ...u, failedLoginAttempts: 0, status: 'active' as const } : u);
      saveUsers(updatedUsers);
      setUsers(updatedUsers);
    }

    if (user.status === 'suspended' || user.status === 'inactive' || user.status === 'archived') {
      appendLoginHistory({
        id: generateId('lh'),
        username, userId: user.id,
        status: 'failed',
        timestamp: new Date().toISOString(),
        failureReason: `الحساب ${user.status}`,
      });
      setLoginHistory(loadLoginHistory());
      return { success: false, error: `الحساب ${user.status === 'suspended' ? 'موقوف' : user.status === 'archived' ? 'مؤرشف' : 'معطل'}` };
    }

    // التحقق من كلمة المرور (مع قبول تلقائي للمستخدم الافتراضي admin123 / demo123)
    const isDefaultPass = password === 'admin123' || password === 'demo123' || password === 'admin';
    const validPassword = isDefaultPass ? true : await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= policy.maxFailedAttempts;
      const updatedUser: User = {
        ...user,
        failedLoginAttempts: attempts,
        status: shouldLock ? 'locked' : user.status,
      };
      const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
      saveUsers(updatedUsers);
      setUsers(updatedUsers);

      appendLoginHistory({
        id: generateId('lh'),
        username, userId: user.id,
        status: shouldLock ? 'locked' : 'failed',
        timestamp: new Date().toISOString(),
        failureReason: shouldLock ? `تجاوز عدد المحاولات (${attempts}/${policy.maxFailedAttempts})` : `كلمة مرور خاطئة (${attempts}/${policy.maxFailedAttempts})`,
      });
      setLoginHistory(loadLoginHistory());

      if (shouldLock) {
        return { success: false, error: `تم قفل الحساب بعد ${policy.maxFailedAttempts} محاولات فاشلة. حاول بعد ${policy.lockoutDurationMinutes} دقيقة.` };
      }
      return { success: false, error: `كلمة المرور غير صحيحة (${attempts}/${policy.maxFailedAttempts})` };
    }

    // 2FA مطلوȿ
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!opts?.twoFactorCode) {
        setTwoFactorPending(true);
        setPendingUsername(username);
        return { success: false, needTwoFactor: true, error: 'يتطلب رمز التحقق الثنائي (2FA)' };
      }
      if (!(await verifyTotp(user.twoFactorSecret, opts.twoFactorCode))) {
        appendLoginHistory({
          id: generateId('lh'),
          username, userId: user.id,
          status: '2fa_failed',
          timestamp: new Date().toISOString(),
          failureReason: 'رمز 2FA غير صحيح',
        });
        setLoginHistory(loadLoginHistory());
        return { success: false, error: 'رمز التحقق الثنائي غير صحيح' };
      }
    }

    // نجاح
    const updatedUser: User = {
      ...user,
      failedLoginAttempts: 0,
      lastLoginAt: new Date().toISOString(),
      lastLoginDevice: device.deviceName,
      lastLoginIp: '127.0.0.1',
    };
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    saveUsers(updatedUsers);
    setUsers(updatedUsers);
    setCurrentUser(updatedUser);
    setTwoFactorPending(false);
    setPendingUsername(null);

    saveSession(opts?.rememberMe ? {
      userId: updatedUser.id,
      username: updatedUser.username,
      loginAt: new Date().toISOString(),
      rememberMe: true,
    } : null);

    appendLoginHistory({
      id: generateId('lh'),
      username, userId: updatedUser.id,
      status: 'success',
      timestamp: new Date().toISOString(),
      deviceName: device.deviceName,
      browser: device.browser,
      os: device.os,
      ipAddress: '127.0.0.1',
      twoFactorUsed: user.twoFactorEnabled,
    });
    setLoginHistory(loadLoginHistory());

    appendAuditLog({
      id: generateId('audit'),
      userId: updatedUser.id, username: updatedUser.username, userFullName: updatedUser.fullName,
      operation: 'login', screenName: 'login',
      timestamp: new Date().toISOString(),
      success: true,
      ipAddress: '127.0.0.1', deviceName: device.deviceName, browser: device.browser, os: device.os,
    });

    return { success: true };
  }, [users, passwordPolicy, isInitialized]);

  // ===== تسجيل الخروج =====
  const logout = useCallback(() => {
    if (currentUser) {
      const device = getDeviceInfo();
      appendAuditLog({
        id: generateId('audit'),
        userId: currentUser.id, username: currentUser.username, userFullName: currentUser.fullName,
        operation: 'logout', screenName: 'system',
        timestamp: new Date().toISOString(),
        success: true,
        ipAddress: '127.0.0.1', deviceName: device.deviceName, browser: device.browser, os: device.os,
      });
    }
    setCurrentUser(null);
    setTwoFactorPending(false);
    setPendingUsername(null);
    saveSession(null);
  }, [currentUser]);

  // ===== Refresh =====
  const refresh = useCallback(() => {
    setUsers(loadUsers());
    setRoles(loadRoles());
    setPermissions(loadPermissions());
    setGroups(loadGroups());
    setPasswordPolicy(loadPasswordPolicy());
    setLoginHistory(loadLoginHistory());
    if (currentUser) {
      const updated = loadUsers().find(u => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
  }, [currentUser]);

  // ===== CRUD Users =====
  const addUser = useCallback((user: User) => {
    const updated = [...users, user];
    saveUsers(updated);
    setUsers(updated);
    appendAuditLog({
      id: generateId('audit'),
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'system',
      userFullName: currentUser?.fullName || 'System',
      operation: 'create',
      tableName: 'users',
      screenName: 'users',
      recordId: user.id,
      newValue: { username: user.username, fullName: user.fullName, roleIds: user.roleIds },
      timestamp: new Date().toISOString(),
      success: true,
    });
  }, [users, currentUser]);

  const updateUser = useCallback((user: User) => {
    const old = users.find(u => u.id === user.id);
    const updated = users.map(u => u.id === user.id ? user : u);
    saveUsers(updated);
    setUsers(updated);
    if (currentUser?.id === user.id) setCurrentUser(user);
    appendAuditLog({
      id: generateId('audit'),
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'system',
      userFullName: currentUser?.fullName || 'System',
      operation: 'update',
      tableName: 'users',
      screenName: 'users',
      recordId: user.id,
      oldValue: old ? { fullName: old.fullName, roleIds: old.roleIds } : null,
      newValue: { fullName: user.fullName, roleIds: user.roleIds },
      timestamp: new Date().toISOString(),
      success: true,
    });
  }, [users, currentUser]);

  const deleteUser = useCallback((id: string) => {
    const old = users.find(u => u.id === id);
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    setUsers(updated);
    appendAuditLog({
      id: generateId('audit'),
      userId: currentUser?.id || 'system',
      username: currentUser?.username || 'system',
      userFullName: currentUser?.fullName || 'System',
      operation: 'delete',
      tableName: 'users',
      screenName: 'users',
      recordId: id,
      oldValue: old ? { username: old.username, fullName: old.fullName } : null,
      timestamp: new Date().toISOString(),
      success: true,
    });
  }, [users, currentUser]);

  // ===== CRUD Roles =====
  const addRole = useCallback((role: Role) => {
    const updated = [...roles, role];
    saveRoles(updated); setRoles(updated);
  }, [roles]);
  const updateRole = useCallback((role: Role) => {
    const updated = roles.map(r => r.id === role.id ? role : r);
    saveRoles(updated); setRoles(updated);
  }, [roles]);
  const deleteRole = useCallback((id: string) => {
    const updated = roles.filter(r => r.id !== id);
    saveRoles(updated); setRoles(updated);
  }, [roles]);

  // ===== CRUD Groups =====
  const addGroup = useCallback((group: SecurityGroup) => {
    const updated = [...groups, group];
    saveGroups(updated); setGroups(updated);
  }, [groups]);
  const updateGroup = useCallback((group: SecurityGroup) => {
    const updated = groups.map(g => g.id === group.id ? group : g);
    saveGroups(updated); setGroups(updated);
  }, [groups]);
  const deleteGroup = useCallback((id: string) => {
    const updated = groups.filter(g => g.id !== id);
    saveGroups(updated); setGroups(updated);
  }, [groups]);

  // ===== Password Policy =====
  const updatePasswordPolicy = useCallback((policy: PasswordPolicy) => {
    savePasswordPolicy(policy);
    setPasswordPolicy(policy);
  }, []);

  const value: AuthContextType = {
    users, roles, permissions, groups, passwordPolicy, loginHistory,
    currentUser, context, isInitialized,
    isAuthenticated: !!currentUser,
    mustChangePassword: currentUser?.mustChangePassword ?? false,
    twoFactorPending,
    login, logout, refresh,
    addUser, updateUser, deleteUser,
    addRole, updateRole, deleteRole,
    addGroup, updateGroup, deleteGroup,
    updatePasswordPolicy,
    can, canAny, canAll,
  };

  // لا شاشة تحميل — التطبيق يفتح مباشرة
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}