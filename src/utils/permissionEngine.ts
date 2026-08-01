/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dynamic Permission Engine — 3-Layer Protection
 *
 * Layer 1 (UI): useHasPermission() hook يخفي/يعطل العناصر
 * Layer 2 (Service): requirePermission() يطرح استثناء قبل أي عملية
 * Layer 3 (Data): filterByScope() يفلتر البيانات حسب dataScope
 *
 * محاكاة لنظام صلاحيات Microsoft Dynamics 365 / SAP / Odoo.
 */

import {
  User, Role, Permission, SecurityGroup, CurrentUserContext,
  PermissionCheckResult, DataScope, PermissionCondition,
} from '../types_auth';

// ====================================================================
// بناء سياق المستخدم الحالي (مع كل الصلاحيات المجمّعة)
// ====================================================================

export function buildUserContext(
  user: User | null,
  roles: Role[],
  groups: SecurityGroup[],
  permissions: Permission[]
): CurrentUserContext {
  if (!user || user.status !== 'active') {
    return {
      user: null, roles: [], groups: [], allPermissions: new Set(),
      dataScope: 'own',
    };
  }

  const userRoles = roles.filter(r => user.roleIds.includes(r.id));
  const userGroups = groups.filter(g => user.groupIds.includes(g.id));

  // جمع الصلاحيات من الأدوار والمجموعات
  const permSet = new Set<string>();
  userRoles.forEach(r => r.permissionIds.forEach(p => permSet.add(p)));
  userGroups.forEach(g => g.permissionIds.forEach(p => permSet.add(p)));
  user.extraPermissions.forEach(p => permSet.add(p));
  // الصلاحيات الممنوعة صراحة تُلغي
  user.deniedPermissions.forEach(p => permSet.delete(p));

  // أعلى أولوية (أولوية أقل = أقوى)
  const dataScope: DataScope = userRoles.length > 0
    ? userRoles.reduce((acc, r) => {
      const order = ['all', 'branch', 'department', 'subordinates', 'assigned', 'own'];
      return order.indexOf(r.dataScope) < order.indexOf(acc) ? r.dataScope : acc;
    }, 'own' as DataScope)
    : 'own';

  return {
    user, roles: userRoles, groups: userGroups,
    allPermissions: permSet, dataScope,
    branch: user.branch, department: user.department,
  };
}

// ====================================================================
// LAYER 1: UI-level permission check (boolean)
// ====================================================================

export function hasPermission(ctx: CurrentUserContext, permissionCode: string): boolean {
  if (!ctx.user) return false;
  // Admin (ALL permissions) is checked via role with `*` in code
  return ctx.allPermissions.has(permissionCode) || ctx.allPermissions.has('*');
}

export function hasAnyPermission(ctx: CurrentUserContext, codes: string[]): boolean {
  return codes.some(c => hasPermission(ctx, c));
}

export function hasAllPermissions(ctx: CurrentUserContext, codes: string[]): boolean {
  return codes.every(c => hasPermission(ctx, c));
}

// ====================================================================
// LAYER 2: Service-level permission check (with error message)
// ====================================================================

export class PermissionDeniedError extends Error {
  constructor(
    public requiredPermission: string,
    public reason: string,
    public context?: any
  ) {
    super(`Permission Denied: ${reason}`);
    this.name = 'PermissionDeniedError';
  }
}

export function requirePermission(ctx: CurrentUserContext, permissionCode: string): void {
  if (!hasPermission(ctx, permissionCode)) {
    throw new PermissionDeniedError(
      permissionCode,
      `المستخدم ${ctx.user?.fullName || 'المجهول'} لا يملك الصلاحية "${permissionCode}"`,
      { permissionCode, userId: ctx.user?.id }
    );
  }
}

export function requireAnyPermission(ctx: CurrentUserContext, codes: string[]): void {
  if (!hasAnyPermission(ctx, codes)) {
    throw new PermissionDeniedError(
      codes.join(' OR '),
      `المستخدم لا يملك أي من الصلاحيات المطلوبة`,
      { codes, userId: ctx.user?.id }
    );
  }
}

export function checkPermission(
  ctx: CurrentUserContext,
  permissionCode: string,
  conditions?: PermissionCondition[],
  entity?: any
): PermissionCheckResult {
  if (!hasPermission(ctx, permissionCode)) {
    return {
      granted: false,
      reason: 'لا يملك الصلاحية المطلوبة',
      requiredPermission: permissionCode,
    };
  }

  // فحص الشروط (Conditions) — مثل "لا يمكن التعديل بعد الإغلاق"
  if (conditions && entity) {
    for (const cond of conditions) {
      if (cond.evaluator && !cond.evaluator(entity)) {
        return {
          granted: false,
          reason: cond.message || 'الشرط غير محقق',
          requiredPermission: permissionCode,
          conditionsApplied: [cond.message || cond.type],
        };
      }
    }
  }

  return { granted: true, requiredPermission: permissionCode };
}

// ====================================================================
// LAYER 3: Data Scoping — تصفية البيانات حسب النطاق
// ====================================================================

export function filterByScope<T extends Record<string, any>>(
  ctx: CurrentUserContext,
  items: T[],
  ownerField: keyof T = 'assignedTo' as any,
  scope?: DataScope
): T[] {
  const activeScope = scope || ctx.dataScope;
  if (!ctx.user) return [];

  switch (activeScope) {
    case 'all':
      return items;
    case 'branch':
      return items.filter(i => i.branch === ctx.user!.branch);
    case 'department':
      return items.filter(i => i.department === ctx.user!.department);
    case 'own':
      return items.filter(i => i[ownerField] === ctx.user!.id);
    case 'assigned':
      return items.filter(i =>
        i[ownerField] === ctx.user!.id ||
        (Array.isArray(i.assignees) && i.assignees.includes(ctx.user!.id))
      );
    case 'subordinates':
      // يتطلب معرفة IDs التابعين (يبسط هنا)
      return items.filter(i =>
        i.directManagerId === ctx.user!.id ||
        i[ownerField] === ctx.user!.id
      );
    default:
      return items;
  }
}

// ====================================================================
// UI Permission-aware helpers
// ====================================================================

/** يستخدم في JSX: {hasPermission(ctx, 'cases.edit') && <Button>...</Button>} */
export const check = {
  can: (ctx: CurrentUserContext, code: string) => hasPermission(ctx, code),
  canAny: (ctx: CurrentUserContext, codes: string[]) => hasAnyPermission(ctx, codes),
  canAll: (ctx: CurrentUserContext, codes: string[]) => hasAllPermissions(ctx, codes),
};

// ====================================================================
// Conditional Permissions — preset conditions for law firm cases
// ====================================================================

export const CASE_CONDITIONS: PermissionCondition[] = [
  {
    type: 'status_not_in',
    field: 'status',
    value: ['منتهية ومحفوظة', 'مشطوبة'],
    message: 'لا يمكن تعديل قضية منتهية أو مشطوبة',
  },
];

export const SESSION_CONDITIONS: PermissionCondition[] = [
  {
    type: 'status_in',
    field: 'approved',
    value: [true],
    message: 'لا يمكن حذف جلسة معتمدة',
  },
];

export const INVOICE_CONDITIONS: PermissionCondition[] = [
  {
    type: 'status_in',
    field: 'status',
    value: ['مدفوعة بالكامل'],
    message: 'لا يمكن تعديل فاتورة مدفوعة',
    evaluator: (inv: any) => inv?.status !== 'مدفوعة بالكامل',
  },
];

export const DOCUMENT_CONDITIONS: PermissionCondition[] = [
  {
    type: 'custom',
    message: 'لا يمكن حذف مستند موقع إلكترونياً',
    evaluator: (doc: any) => !doc?.electronicallySigned,
  },
];

export const CONTRACT_CONDITIONS: PermissionCondition[] = [
  {
    type: 'custom',
    message: 'لا يمكن حذف عقد بعد اعتماده',
    evaluator: (contract: any) => !contract?.approved,
  },
];