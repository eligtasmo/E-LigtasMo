// src/rbac/permissions.ts
export type Role = 'admin' | 'brgy' | 'resident' | 'guest';

export type Permission =
  | 'users.view'
  | 'users.manage'
  | 'logs.export'
  | 'incident.create'
  | 'incident.view'
  | 'hazard.manage'
  | 'shelter.manage'
  | 'alerts.manage'
  | 'routes.suggest'
  | 'routes.view';

type PermissionMap = Record<Role, Set<Permission>>;

// Baseline, can be extended to granular brgy scopes later
const rolePermissions: PermissionMap = {
  admin: new Set([
    'users.view',
    'users.manage',
    'logs.export',
    'incident.create',
    'incident.view',
    'hazard.manage',
    'shelter.manage',
    'alerts.manage',
    'routes.suggest',
    'routes.view',
  ]),
  brgy: new Set([
    'users.view',
    'incident.create',
    'incident.view',
    'hazard.manage',
    'shelter.manage',
    'alerts.manage',
    'routes.suggest',
    'routes.view',
  ]),
  resident: new Set([
    'incident.view',
    'routes.view',
  ]),
  guest: new Set([
    'routes.view',
  ]),
};

export const hasPermission = (role: Role | string | null | undefined, permission: Permission): boolean => {
  const normalized: Role = (role === 'admin' || role === 'brgy' || role === 'resident') ? (role as Role) : 'guest';
  const perms = rolePermissions[normalized];
  return perms.has(permission);
};

// Convenience helper for route guards
export const canAccess = (role: Role | string | null | undefined, requiredRole?: Role, requiredPermission?: Permission): boolean => {
  const normalized: Role = (role === 'admin' || role === 'brgy' || role === 'resident') ? (role as Role) : 'guest';
  if (requiredRole && normalized !== requiredRole) return false;
  if (requiredPermission && !hasPermission(normalized, requiredPermission)) return false;
  return true;
};