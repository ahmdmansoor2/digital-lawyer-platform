/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * وحدة المستخدمين والصلاحيات - Types & Interfaces
 *
 * تصميم يحاكي Microsoft Dynamics 365 / SAP / Oracle / Odoo Enterprise:
 * - User Management
 * - Role-Based Access Control (RBAC)
 * - Attribute-Based Access Control (ABAC) — للصلاحيات الشرطية
 * - Security Groups
 * - Data Scoping (Branch/Department filtering)
 * - Audit Trail
 * - Login History
 * - Password Policies
 * - 2FA / OTP
 */

// ====================================================================
// USERS
// ====================================================================

export type UserStatus =
  | 'active'         // نشط
  | 'inactive'       // معطل
  | 'locked'         // مقفل (محاولات فاشلة)
  | 'suspended'      // موقوف
  | 'pending'        // في انتظار التفعيل
  | 'archived';      // مؤرشف

export type UserGrade =
  | 'partner'        // شريك
  | 'senior'         // محامي أول
  | 'junior'         // محامي
  | 'trainee'        // متدرب
  | 'paralegal'      // باحث قانوني
  | 'researcher'     // باحث
  | 'secretary'      // سكرتير
  | 'accountant'     // محاسب
  | 'hr'             // موارد بشرية
  | 'admin'          // مدير نظام
  | 'readonly';      // قارئ فقط

export interface UserDevice {
  id: string;
  deviceName: string;
  os: string;
  browser: string;
  ip: string;
  location?: string;
  firstSeen: string;
  lastSeen: string;
  trusted: boolean;
}

export interface User {
  id: string;
  /** اسم المستخدم (login) — فريد */
  username: string;
  /** كلمة المرور (hashed) — مخزنة بشكل آمن */
  passwordHash: string;
  /** هل يجب تغيير كلمة المرور عند أول دخول */
  mustChangePassword: boolean;
  /** هل الحساب محمي بـ 2FA */
  twoFactorEnabled: boolean;
  /** سر TOTP — مشفر */
  twoFactorSecret?: string;
  /** Backup codes للـ 2FA */
  twoFactorBackupCodes?: string[];

  // البيانات الشخصية
  fullName: string;
  email?: string;
  phone?: string;
  altPhone?: string;
  nationalId?: string;
  personalPhoto?: string;

  // البيانات الوظيفية
  jobTitle: string;
  grade: UserGrade;
  department?: string;
  branch?: string;
  directManagerId?: string;

  // الحالة
  status: UserStatus;
  failedLoginAttempts: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;

  // الربط بالأدوار والمجموعات (Many-to-Many)
  roleIds: string[];
  groupIds: string[];

  // الصلاحيات الإضافية الخاصة بالمستخدم (تُضاف فوق صلاحيات الأدوار)
  extraPermissions: string[];
  /** الصلاحيات الممنوعة صراحة (تتجاوز صلاحيات الدور) */
  deniedPermissions: string[];

  // سياسات كلمة المرور
  passwordLastChangedAt?: string;
  passwordExpiresAt?: string;
  passwordHistory: string[]; // hashed passwords history

  // التواريخ
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  lastActivityAt?: string;

  // معلومات إضافية
  notes?: string;
  source: 'mock' | 'manual' | 'imported' | 'ldap';
}

// ====================================================================
// ROLES
// ====================================================================

export interface Role {
  id: string;
  /** رمز فريد للدور (مثل: ADMIN, LAWYER_SENIOR) */
  code: string;
  name: string;
  description?: string;
  /** الصلاحيات المرتبطة بهذا الدور */
  permissionIds: string[];
  /** نطاق البيانات المرتبط بالدور (Branch/Department/Own) */
  dataScope: DataScope;
  /** أولوية الدور (لحل التعارض) */
  priority: number;
  /** هل هذا دور نظامي لا يمكن حذفه */
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// ====================================================================
// PERMISSIONS
// ====================================================================

export type PermissionScope = 'view' | 'add' | 'edit' | 'delete' | 'print' |
  'copy' | 'archive' | 'restore' | 'approve' | 'unapprove' |
  'upload' | 'download' | 'share' | 'email' | 'whatsapp' | 'sms' |
  'sign' | 'export_pdf' | 'export_word' | 'export_excel' |
  'import' | 'run_workflow' | 'stop_workflow' |
  'create_report' | 'edit_report' | 'delete_report' | 'view_report';

export type PermissionCategory =
  | 'cases' | 'clients' | 'opponents' | 'notes' | 'library' | 'documents'
  | 'financials' | 'templates' | 'contracts' | 'calendar' | 'tasks'
  | 'bailiff' | 'reports' | 'users' | 'roles' | 'permissions'
  | 'groups' | 'audit' | 'login_history' | 'settings' | 'database'
  | 'archive';

export interface Permission {
  id: string;
  /** رمز فريد (مثل: cases.view) */
  code: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  scope: PermissionScope;
  /** شروط إضافية للصلاحية (مثل: لا يمكن التعديل بعد الإغلاق) */
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'status_not_in' | 'status_in' | 'field_required' | 'custom';
  field?: string;
  value?: any;
  message?: string;
  evaluator?: (entity: any) => boolean;
}

// ====================================================================
// DATA SCOPES
// ====================================================================

export type DataScope =
  | 'all'              // كل البيانات
  | 'branch'           // بيانات الفرع فقط
  | 'department'       // بيانات القسم فقط
  | 'own'              // بياناته فقط
  | 'assigned'         // القضايا/المهام المسندة إليه
  | 'subordinates';    // الموظفون التابعون له

// ====================================================================
// SECURITY GROUPS
// ====================================================================

export interface SecurityGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  permissionIds: string[];
  memberIds: string[]; // user IDs
  createdAt: string;
  updatedAt: string;
}

// ====================================================================
// AUDIT TRAIL
// ====================================================================

export type AuditOperation = 'create' | 'update' | 'delete' | 'view' |
  'login' | 'logout' | 'login_failed' | 'permission_change' |
  'password_change' | 'export' | 'import' | 'approve' | 'unapprove' |
  'archive' | 'restore' | 'sign';

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  operation: AuditOperation;
  tableName?: string;
  screenName?: string;
  recordId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

// ====================================================================
// LOGIN HISTORY
// ====================================================================

export type LoginStatus = 'success' | 'failed' | 'locked' | 'expired' | '2fa_required' | '2fa_failed';

export interface LoginHistory {
  id: string;
  username: string;
  userId?: string;
  status: LoginStatus;
  ipAddress?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
  userAgent?: string;
  timestamp: string;
  sessionDurationMs?: number;
  failureReason?: string;
  /** هل كانت 2FA مستخدمɿ */
  twoFactorUsed?: boolean;
}

// ====================================================================
// PASSWORD POLICY
// ====================================================================

export interface PasswordPolicy {
  id: string;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigits: boolean;
  requireSpecialChars: boolean;
  /** منع استخدام آخر N من كلمات المرور */
  preventLastN: number;
  /** مدة انتهاء كلمة المرور بالأيام (0 = لا تنتهي) */
  expiryDays: number;
  /** عدد المحاولات الفاشلة قبل القفل */
  maxFailedAttempts: number;
  /** مدة القفل بالدقائق */
  lockoutDurationMinutes: number;
  /** مدة الجلسة الخاملة قبل تسجيل الخروج التلقائي (بالدقائق) */
  sessionTimeoutMinutes: number;
  /** هل تتطلب كلمة مرور قوية دائماً؟ */
  forceStrongPassword: boolean;
  updatedAt: string;
}

// ====================================================================
// SESSION
// ====================================================================

export interface UserSession {
  id: string;
  userId: string;
  username: string;
  /** Refresh Token (hashed) */
  refreshTokenHash: string;
  ipAddress: string;
  deviceName: string;
  browser: string;
  os: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  rememberMe: boolean;
}

// ====================================================================
// PERMISSION CHECK RESULT
// ====================================================================

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  requiredPermission?: string;
  scope?: DataScope;
  conditionsApplied?: string[];
}

// ====================================================================
// CURRENT USER CONTEXT (للاستخدام في الـ Permission Engine)
// ====================================================================

export interface CurrentUserContext {
  user: User | null;
  roles: Role[];
  groups: SecurityGroup[];
  allPermissions: Set<string>;
  dataScope: DataScope;
  branch?: string;
  department?: string;
}