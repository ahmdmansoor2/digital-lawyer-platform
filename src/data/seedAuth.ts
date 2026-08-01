/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seed Data للوحدة المؤسسية — أول تشغيل.
 *
 * يتضمن:
 * - 12 دور افتراضي (System roles)
 * - ~70 صلاحية (Permissions)
 * - 1 مستخدم Administrator افتراضي (admin / admin123)
 * - سياسة كلمات مرور افتراضية
 * - مجموعات أمنية افتراضية
 */

import {
  Role, Permission, User, SecurityGroup, PasswordPolicy,
  PermissionScope, PermissionCategory, UserStatus, UserGrade,
  DataScope,
} from '../types_auth';
import { generateTotpSecret, hashPassword } from '../utils/security';

// ====================================================================
// PERMISSIONS (70+ صلاحية)
// ====================================================================

export function buildDefaultPermissions(): Permission[] {
  const perms: { category: PermissionCategory; scope: PermissionScope; code: string; name: string; description?: string }[] = [
    // ===== CASES =====
    { category: 'cases', scope: 'view', code: 'cases.view', name: 'عرض القضايا' },
    { category: 'cases', scope: 'add', code: 'cases.add', name: 'إضافة قضية' },
    { category: 'cases', scope: 'edit', code: 'cases.edit', name: 'تعديل قضية' },
    { category: 'cases', scope: 'delete', code: 'cases.delete', name: 'حذف قضية' },
    { category: 'cases', scope: 'print', code: 'cases.print', name: 'طباعة قضية' },
    { category: 'cases', scope: 'archive', code: 'cases.archive', name: 'أرشفة قضية' },
    { category: 'cases', scope: 'restore', code: 'cases.restore', name: 'استعادة قضية' },
    { category: 'cases', scope: 'approve', code: 'cases.approve', name: 'اعتماد قضية' },
    { category: 'cases', scope: 'sign', code: 'cases.sign', name: 'توقيع قضية إلكترونياً' },

    // ===== CLIENTS =====
    { category: 'clients', scope: 'view', code: 'clients.view', name: 'عرض العملاء' },
    { category: 'clients', scope: 'add', code: 'clients.add', name: 'إضافة عميل' },
    { category: 'clients', scope: 'edit', code: 'clients.edit', name: 'تعديل عميل' },
    { category: 'clients', scope: 'delete', code: 'clients.delete', name: 'حذف عميل' },
    { category: 'clients', scope: 'export_excel', code: 'clients.export', name: 'تصدير قائمة العملاء' },
    { category: 'clients', scope: 'whatsapp', code: 'clients.whatsapp', name: 'إرسال WhatsApp للعملاء' },

    // ===== OPPONENTS =====
    { category: 'opponents', scope: 'view', code: 'opponents.view', name: 'عرض الخصوم' },
    { category: 'opponents', scope: 'add', code: 'opponents.add', name: 'إضافة خصم' },
    { category: 'opponents', scope: 'edit', code: 'opponents.edit', name: 'تعديل خصم' },
    { category: 'opponents', scope: 'delete', code: 'opponents.delete', name: 'حذف خصم' },

    // ===== NOTES =====
    { category: 'notes', scope: 'view', code: 'notes.view', name: 'عرض الملاحظات' },
    { category: 'notes', scope: 'add', code: 'notes.add', name: 'إضافة ملاحظة' },
    { category: 'notes', scope: 'edit', code: 'notes.edit', name: 'تعديل ملاحظة' },
    { category: 'notes', scope: 'delete', code: 'notes.delete', name: 'حذف ملاحظة' },

    // ===== LIBRARY =====
    { category: 'library', scope: 'view', code: 'library.view', name: 'عرض المكتبة القانونية' },
    { category: 'library', scope: 'add', code: 'library.add', name: 'إضافة للمكتبة' },
    { category: 'library', scope: 'edit', code: 'library.edit', name: 'تعديل المكتبة' },
    { category: 'library', scope: 'delete', code: 'library.delete', name: 'حذف من المكتبة' },
    { category: 'library', scope: 'import', code: 'library.import', name: 'استيراد للمكتبة' },
    { category: 'library', scope: 'export_pdf', code: 'library.export', name: 'تصدير من المكتبة' },

    // ===== DOCUMENTS =====
    { category: 'documents', scope: 'view', code: 'documents.view', name: 'عرض المستندات' },
    { category: 'documents', scope: 'add', code: 'documents.add', name: 'رفع مستند' },
    { category: 'documents', scope: 'edit', code: 'documents.edit', name: 'تعديل مستند' },
    { category: 'documents', scope: 'delete', code: 'documents.delete', name: 'حذف مستند' },
    { category: 'documents', scope: 'download', code: 'documents.download', name: 'تنزيل مستند' },
    { category: 'documents', scope: 'sign', code: 'documents.sign', name: 'توقيع إلكتروني' },

    // ===== FINANCIALS =====
    { category: 'financials', scope: 'view', code: 'financials.view', name: 'عرض المالية' },
    { category: 'financials', scope: 'edit', code: 'financials.edit', name: 'تعديل المالية' },
    { category: 'financials', scope: 'delete', code: 'financials.delete', name: 'حذف المالية' },
    { category: 'financials', scope: 'export_pdf', code: 'financials.export_pdf', name: 'تصدير PDF' },
    { category: 'financials', scope: 'export_excel', code: 'financials.export_excel', name: 'تصدير Excel' },
    { category: 'financials', scope: 'approve', code: 'financials.approve', name: 'اعتماد دفعة' },

    // ===== TEMPLATES =====
    { category: 'templates', scope: 'view', code: 'templates.view', name: 'عرض القوالب' },
    { category: 'templates', scope: 'add', code: 'templates.add', name: 'إضافة قالب' },
    { category: 'templates', scope: 'edit', code: 'templates.edit', name: 'تعديل قالب' },
    { category: 'templates', scope: 'delete', code: 'templates.delete', name: 'حذف قالب' },

    // ===== CONTRACTS =====
    { category: 'contracts', scope: 'view', code: 'contracts.view', name: 'عرض العقود' },
    { category: 'contracts', scope: 'edit', code: 'contracts.edit', name: 'تعديل العقود' },
    { category: 'contracts', scope: 'delete', code: 'contracts.delete', name: 'حذف العقود' },
    { category: 'contracts', scope: 'approve', code: 'contracts.approve', name: 'اعتماد العقد' },
    { category: 'contracts', scope: 'export_word', code: 'contracts.export_word', name: 'تصدير Word' },

    // ===== CALENDAR / SESSIONS =====
    { category: 'calendar', scope: 'view', code: 'calendar.view', name: 'عرض التقويم' },
    { category: 'calendar', scope: 'add', code: 'calendar.add', name: 'إضافة جلسة' },
    { category: 'calendar', scope: 'edit', code: 'calendar.edit', name: 'تعديل جلسة' },
    { category: 'calendar', scope: 'delete', code: 'calendar.delete', name: 'حذف جلسة' },
    { category: 'calendar', scope: 'sms', code: 'calendar.sms', name: 'تذكير SMS' },
    { category: 'calendar', scope: 'whatsapp', code: 'calendar.whatsapp', name: 'تذكير WhatsApp' },

    // ===== TASKS =====
    { category: 'tasks', scope: 'view', code: 'tasks.view', name: 'عرض المهام' },
    { category: 'tasks', scope: 'add', code: 'tasks.add', name: 'إضافة مهمة' },
    { category: 'tasks', scope: 'edit', code: 'tasks.edit', name: 'تعديل مهمة' },
    { category: 'tasks', scope: 'delete', code: 'tasks.delete', name: 'حذف مهمة' },
    { category: 'tasks', scope: 'approve', code: 'tasks.approve', name: 'اعتماد مهمة' },

    // ===== BAILIFF PAPERS =====
    { category: 'bailiff', scope: 'view', code: 'bailiff.view', name: 'عرض أوراق المحضرين' },
    { category: 'bailiff', scope: 'add', code: 'bailiff.add', name: 'إضافة ورقة محضرين' },
    { category: 'bailiff', scope: 'edit', code: 'bailiff.edit', name: 'تعديل ورقة محضرين' },
    { category: 'bailiff', scope: 'delete', code: 'bailiff.delete', name: 'حذف ورقة محضرين' },
    { category: 'bailiff', scope: 'print', code: 'bailiff.print', name: 'طباعة ورقة محضرين' },

    // ===== REPORTS =====
    { category: 'reports', scope: 'view_report', code: 'reports.view', name: 'عرض التقارير' },
    { category: 'reports', scope: 'create_report', code: 'reports.create', name: 'إنشاء تقرير' },
    { category: 'reports', scope: 'edit_report', code: 'reports.edit', name: 'تعديل تقرير' },
    { category: 'reports', scope: 'delete_report', code: 'reports.delete', name: 'حذف تقرير' },
    { category: 'reports', scope: 'export_pdf', code: 'reports.export_pdf', name: 'تصدير تقرير PDF' },
    { category: 'reports', scope: 'export_excel', code: 'reports.export_excel', name: 'تصدير تقرير Excel' },

    // ===== USER MANAGEMENT =====
    { category: 'users', scope: 'view', code: 'users.view', name: 'عرض المستخدمين' },
    { category: 'users', scope: 'add', code: 'users.add', name: 'إضافة مستخدم' },
    { category: 'users', scope: 'edit', code: 'users.edit', name: 'تعديل مستخدم' },
    { category: 'users', scope: 'delete', code: 'users.delete', name: 'حذف مستخدم' },
    { category: 'users', scope: 'approve', code: 'users.lock', name: 'قفل/إلغاء قفل مستخدم' },

    // ===== ROLES & PERMISSIONS =====
    { category: 'roles', scope: 'view', code: 'roles.view', name: 'عرض الأدوار' },
    { category: 'roles', scope: 'add', code: 'roles.add', name: 'إضافة دور' },
    { category: 'roles', scope: 'edit', code: 'roles.edit', name: 'تعديل دور' },
    { category: 'roles', scope: 'delete', code: 'roles.delete', name: 'حذف دور' },
    { category: 'permissions', scope: 'view', code: 'permissions.view', name: 'عرض الصلاحيات' },
    { category: 'permissions', scope: 'edit', code: 'permissions.edit', name: 'تعديل الصلاحيات' },

    // ===== SECURITY =====
    { category: 'groups', scope: 'view', code: 'groups.view', name: 'عرض المجموعات' },
    { category: 'groups', scope: 'add', code: 'groups.add', name: 'إضافة مجموعة' },
    { category: 'groups', scope: 'edit', code: 'groups.edit', name: 'تعديل مجموعة' },
    { category: 'groups', scope: 'delete', code: 'groups.delete', name: 'حذف مجموعة' },
    { category: 'audit', scope: 'view', code: 'audit.view', name: 'عرض سجل العمليات' },
    { category: 'audit', scope: 'export_excel', code: 'audit.export', name: 'تصدير سجل العمليات' },
    { category: 'login_history', scope: 'view', code: 'login.view', name: 'عرض سجل الدخول' },

    // ===== SYSTEM =====
    { category: 'settings', scope: 'view', code: 'settings.view', name: 'عرض الإعدادات' },
    { category: 'settings', scope: 'edit', code: 'settings.edit', name: 'تعديل الإعدادات' },
    { category: 'database', scope: 'view', code: 'database.view', name: 'عرض قاعدة البيانات' },
    { category: 'archive', scope: 'view', code: 'archive.view', name: 'عرض الأرشيف' },
    { category: 'archive', scope: 'restore', code: 'archive.restore', name: 'استعادة من الأرشيف' },
  ];

  return perms.map(p => ({
    id: p.code,
    code: p.code,
    name: p.name,
    description: p.description,
    category: p.category,
    scope: p.scope,
  }));
}

// ====================================================================
// ROLES (12 دور)
// ====================================================================

const ALL_PERMS = '*'; // wildcard for admin

export function buildDefaultRoles(): Role[] {
  return [
    {
      id: 'role_admin',
      code: 'ADMIN',
      name: 'مدير النظام',
      description: 'صلاحيات كاملة على كل النظام',
      permissionIds: [ALL_PERMS],
      dataScope: 'all',
      priority: 0,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_office_manager',
      code: 'OFFICE_MANAGER',
      name: 'مدير المكتب',
      description: 'إدارة شاملة للمكتب والصلاحيات الإدارية',
      permissionIds: [
        'cases.*', 'clients.*', 'opponents.*', 'notes.*',
        'library.view', 'library.add', 'library.edit',
        'documents.*', 'financials.*', 'templates.*',
        'contracts.view', 'contracts.edit', 'contracts.approve',
        'calendar.*', 'tasks.*', 'bailiff.*',
        'reports.view', 'reports.export_pdf', 'reports.export_excel',
        'users.view', 'groups.view', 'audit.view',
      ],
      dataScope: 'all',
      priority: 1,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_partner',
      code: 'PARTNER',
      name: 'شريك',
      description: 'شريك في المكتب - صلاحيات واسعة على بياناته وفريقه',
      permissionIds: [
        'cases.*', 'clients.*', 'opponents.*', 'notes.*',
        'library.*', 'documents.*', 'financials.view',
        'contracts.*', 'calendar.*', 'tasks.*',
        'reports.view', 'reports.export_pdf',
        'users.view',
      ],
      dataScope: 'subordinates',
      priority: 2,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_senior_lawyer',
      code: 'SENIOR_LAWYER',
      name: 'محامي أول',
      description: 'محامي بخبرة - صلاحيات متقدمة',
      permissionIds: [
        'cases.view', 'cases.add', 'cases.edit', 'cases.print', 'cases.sign',
        'cases.archive', 'cases.approve',
        'clients.view', 'clients.add', 'clients.edit', 'clients.whatsapp',
        'opponents.*',
        'notes.*',
        'library.*',
        'documents.view', 'documents.add', 'documents.edit', 'documents.download', 'documents.sign',
        'contracts.view', 'contracts.edit',
        'calendar.*',
        'tasks.view', 'tasks.add', 'tasks.edit', 'tasks.approve',
        'reports.view',
      ],
      dataScope: 'assigned',
      priority: 3,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_lawyer',
      code: 'LAWYER',
      name: 'محامي',
      description: 'محامي - صلاحيات أساسية على القضايا المسندة',
      permissionIds: [
        'cases.view', 'cases.add', 'cases.edit', 'cases.print',
        'clients.view', 'clients.add', 'clients.edit',
        'opponents.view', 'opponents.add', 'opponents.edit',
        'notes.*',
        'library.view', 'library.add',
        'documents.view', 'documents.add', 'documents.edit', 'documents.download',
        'contracts.view',
        'calendar.view', 'calendar.add', 'calendar.edit',
        'tasks.view', 'tasks.add', 'tasks.edit',
        'reports.view',
      ],
      dataScope: 'assigned',
      priority: 4,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_trainee',
      code: 'TRAINEE',
      name: 'متدرب',
      description: 'متدرب - صلاحيات قراءة فقط + إضافة محدودة',
      permissionIds: [
        'cases.view',
        'clients.view',
        'library.view',
        'calendar.view',
        'notes.view', 'notes.add',
      ],
      dataScope: 'own',
      priority: 5,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_researcher',
      code: 'RESEARCHER',
      name: 'باحث قانوني',
      description: 'باحث - تركّز على المكتبة والقضايا',
      permissionIds: [
        'cases.view',
        'library.*',
        'documents.view',
        'notes.*',
        'calendar.view',
      ],
      dataScope: 'all',
      priority: 6,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_secretary',
      code: 'SECRETARY',
      name: 'سكرتير',
      description: 'سكرتير - إدارة المواعيد والتذكيرات',
      permissionIds: [
        'cases.view', 'cases.add',
        'clients.view', 'clients.add', 'clients.edit',
        'calendar.*',
        'tasks.*',
        'bailiff.view', 'bailiff.add', 'bailiff.print',
        'documents.view', 'documents.add',
        'notes.*',
        'reports.view',
      ],
      dataScope: 'all',
      priority: 7,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_accountant',
      code: 'ACCOUNTANT',
      name: 'محاسب',
      description: 'محاسب - إدارة المالية والفواتير',
      permissionIds: [
        'cases.view',
        'clients.view',
        'financials.*',
        'contracts.view',
        'reports.view', 'reports.export_pdf', 'reports.export_excel',
        'tasks.view',
      ],
      dataScope: 'all',
      priority: 8,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_hr',
      code: 'HR',
      name: 'الموارد البشرية',
      description: 'إدارة المستخدمين والصلاحيات',
      permissionIds: [
        'users.view', 'users.add', 'users.edit', 'users.lock',
        'roles.view', 'permissions.view',
        'groups.view', 'groups.add', 'groups.edit',
        'audit.view',
        'login.view',
      ],
      dataScope: 'all',
      priority: 9,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_data_entry',
      code: 'DATA_ENTRY',
      name: 'مدخل بيانات',
      description: 'مدخل بيانات - إضافة فقط بدون تعديل',
      permissionIds: [
        'cases.add',
        'clients.add',
        'opponents.add',
        'documents.add',
        'calendar.add',
        'tasks.add',
        'notes.add',
      ],
      dataScope: 'all',
      priority: 10,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'role_readonly',
      code: 'READONLY',
      name: 'قارئ فقط',
      description: 'قراءة فقط - لا يمكن التعديل أو الحذف',
      permissionIds: [
        'cases.view', 'clients.view', 'opponents.view',
        'library.view', 'documents.view',
        'calendar.view', 'tasks.view',
        'notes.view',
        'reports.view',
        'financials.view',
      ],
      dataScope: 'all',
      priority: 100,
      isSystem: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// ====================================================================
// SECURITY GROUPS
// ====================================================================

export function buildDefaultGroups(): SecurityGroup[] {
  return [
    {
      id: 'group_executive',
      code: 'EXECUTIVE',
      name: 'الإدارة العليا',
      description: 'كبار المديرين والشركاء',
      permissionIds: ['cases.approve', 'contracts.approve', 'financials.approve'],
      memberIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'group_legal_team',
      code: 'LEGAL_TEAM',
      name: 'الفريق القانوني',
      description: 'كل المحامين والباحثين',
      permissionIds: ['cases.add', 'cases.edit', 'library.add', 'library.edit'],
      memberIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'group_finance_team',
      code: 'FINANCE_TEAM',
      name: 'فريق المالية',
      description: 'المحاسبين ومديري المالي',
      permissionIds: ['financials.add', 'financials.edit', 'financials.approve'],
      memberIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'group_hr_team',
      code: 'HR_TEAM',
      name: 'فريق الموارد البشرية',
      description: 'إدارة شؤون الموظفين',
      permissionIds: ['users.add', 'users.edit', 'users.lock'],
      memberIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'group_support',
      code: 'SUPPORT',
      name: 'الدعم الفني',
      description: 'الفريق التقني',
      permissionIds: ['settings.edit', 'database.view'],
      memberIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// ====================================================================
// PASSWORD POLICY
// ====================================================================

export function buildDefaultPasswordPolicy(): PasswordPolicy {
  return {
    id: 'default',
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireDigits: true,
    requireSpecialChars: true,
    preventLastN: 5,
    expiryDays: 90,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTimeoutMinutes: 60,
    forceStrongPassword: true,
    updatedAt: new Date().toISOString(),
  };
}

// ====================================================================
// DEFAULT ADMIN USER
// ====================================================================

/** يبني المستخدم Administrator الافتراضي — كلمة المرور: admin123 */
export async function buildDefaultAdminUser(): Promise<User> {
  const passwordHash = await hashPassword('admin123');
  return {
    id: 'user_admin',
    username: 'admin',
    passwordHash,
    mustChangePassword: false,
    twoFactorEnabled: false,
    fullName: 'مدير النظام',
    email: 'admin@lawfirm.local',
    phone: '01000000000',
    jobTitle: 'مدير النظام',
    grade: 'admin',
    department: 'الإدارة',
    status: 'active',
    failedLoginAttempts: 0,
    roleIds: ['role_admin'],
    groupIds: ['group_executive'],
    extraPermissions: [],
    deniedPermissions: [],
    passwordHistory: [passwordHash],
    passwordLastChangedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'mock',
  };
}

/** بعض المستخدمين التجريبيين */
export async function buildDemoUsers(): Promise<User[]> {
  const users: { username: string; fullName: string; grade: any; jobTitle: string; roleIds: string[]; groupIds: string[]; department: string; email?: string; phone?: string; }[] = [
    { username: 'ahmed', fullName: 'أحمد منصور', grade: 'partner', jobTitle: 'شريك مؤسس', roleIds: ['role_partner'], groupIds: ['group_executive', 'group_legal_team'], department: 'الشركاء', email: 'ahmed@lawfirm.local', phone: '01001111222' },
    { username: 'mohamed', fullName: 'محمد علي', grade: 'senior', jobTitle: 'محامي أول', roleIds: ['role_senior_lawyer'], groupIds: ['group_legal_team'], department: 'القضايا المدنية', email: 'mohamed@lawfirm.local', phone: '01002223333' },
    { username: 'sara', fullName: 'سارة حسن', grade: 'junior', jobTitle: 'محامية', roleIds: ['role_lawyer'], groupIds: ['group_legal_team'], department: 'القضايا التجارية', email: 'sara@lawfirm.local', phone: '01003334444' },
    { username: 'ali', fullName: 'علي إبراهيم', grade: 'researcher', jobTitle: 'باحث قانوني', roleIds: ['role_researcher'], groupIds: ['group_legal_team'], department: 'البحث القانوني', email: 'ali@lawfirm.local' },
    { username: 'nour', fullName: 'نور أحمد', grade: 'secretary', jobTitle: 'سكرتيرة', roleIds: ['role_secretary'], groupIds: [], department: 'السكرتارية', email: 'nour@lawfirm.local', phone: '01004445555' },
    { username: 'khaled', fullName: 'خالد فؤاد', grade: 'accountant', jobTitle: 'محاسب', roleIds: ['role_accountant'], groupIds: ['group_finance_team'], department: 'المالية', email: 'khaled@lawfirm.local' },
    { username: 'reem', fullName: 'ريم سامي', grade: 'trainee', jobTitle: 'متدرب', roleIds: ['role_trainee'], groupIds: ['group_legal_team'], department: 'التدريب', email: 'reem@lawfirm.local' },
  ];

  const demoPasswordHash = await hashPassword('demo123');
  const result: User[] = [];
  for (const u of users) {
    const passwordHash = demoPasswordHash;
    result.push({
      id: 'user_' + u.username,
      username: u.username,
      passwordHash,
    mustChangePassword: true,
      twoFactorEnabled: false,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      jobTitle: u.jobTitle,
      grade: u.grade,
      department: u.department,
      status: 'active',
      failedLoginAttempts: 0,
      roleIds: u.roleIds,
      groupIds: u.groupIds,
      extraPermissions: [],
      deniedPermissions: [],
      passwordHistory: [passwordHash],
      passwordLastChangedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'mock',
    });
  }
  return result;
}