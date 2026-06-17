import { Role } from '@/types';

export const STAFF_PORTAL_ROLES = [Role.ADMIN, Role.ACCOUNTANT, Role.DATA_ENTRY, Role.LOGISTICS, Role.REPORTS_MANAGER, Role.DRIVER] as const;
export const CLIENT_PORTAL_ROLES = [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER] as const;
export const SUBCONTRACTOR_PORTAL_ROLES = [Role.SUBCONTRACTOR, Role.DRIVER] as const;

const ADMIN_ASSIGNABLE_ROLES = [
  Role.ADMIN,
  Role.COMPANY_USER,
  Role.PROJECT_USER,
  Role.STAFF,
  Role.DATA_ENTRY,
  Role.LOGISTICS,
  Role.ACCOUNTANT,
  Role.SUBCONTRACTOR,
  Role.REPORTS_MANAGER,
  Role.DRIVER,
  Role.CLIENT,
] as const;

const STAFF_ASSIGNABLE_ROLES = [Role.DATA_ENTRY, Role.LOGISTICS, Role.ACCOUNTANT, Role.REPORTS_MANAGER, Role.DRIVER] as const;
const CLIENT_ASSIGNABLE_ROLES = [Role.CLIENT, Role.COMPANY_USER, Role.PROJECT_USER] as const;
const SUBCONTRACTOR_ASSIGNABLE_ROLES = [Role.SUBCONTRACTOR, Role.DRIVER] as const;

const COMPANY_ADMIN_ASSIGNABLE_ROLES = [Role.PROJECT_USER] as const;
const REPORTS_MANAGER_ASSIGNABLE_ROLES = [Role.DATA_ENTRY, Role.LOGISTICS, Role.ACCOUNTANT, Role.REPORTS_MANAGER] as const;
const LOGISTICS_ASSIGNABLE_ROLES = [Role.DRIVER] as const;
const DEFAULT_ASSIGNABLE_ROLES = [Role.DATA_ENTRY] as const;

export const getAssignableRoles = (actorRole: Role, isCompanyAdmin = false): Role[] => {
  if (isCompanyAdmin) {
    return [...COMPANY_ADMIN_ASSIGNABLE_ROLES];
  }

  switch (actorRole) {
    case Role.ADMIN:
      return [...ADMIN_ASSIGNABLE_ROLES];
    case Role.REPORTS_MANAGER:
      return [...REPORTS_MANAGER_ASSIGNABLE_ROLES];
    case Role.LOGISTICS:
      return [...LOGISTICS_ASSIGNABLE_ROLES];
    case Role.DATA_ENTRY:
      return [...DEFAULT_ASSIGNABLE_ROLES];
    default:
      return [...DEFAULT_ASSIGNABLE_ROLES];
  }
};

export const getApprovalRolesForRequest = (requestRole?: string, actorRole: Role = Role.ADMIN): Role[] => {
  const baseRoles = (() => {
    switch (requestRole) {
      case 'CLIENT':
        return CLIENT_ASSIGNABLE_ROLES;
      case 'SUBCONTRACTOR':
        return SUBCONTRACTOR_ASSIGNABLE_ROLES;
      case 'STAFF':
      default:
        return STAFF_ASSIGNABLE_ROLES;
    }
  })();

  const actorRoles = getAssignableRoles(actorRole, false);
  return baseRoles.filter((role: Role) => actorRoles.includes(role) || actorRole === Role.ADMIN);
};
