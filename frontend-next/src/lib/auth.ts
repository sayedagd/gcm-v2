export const GCM_ROLE_VALUES = [
  "ADMIN",
  "ACCOUNTANT",
  "DATA_ENTRY",
  "LOGISTICS",
  "REPORTS_MANAGER",
  "DRIVER",
  "CLIENT",
  "COMPANY_USER",
  "PROJECT_USER",
  "SUBCONTRACTOR",
] as const;

export type GcmRole = (typeof GCM_ROLE_VALUES)[number];

export const CLIENT_ROLES: readonly GcmRole[] = ["CLIENT", "COMPANY_USER", "PROJECT_USER"];
export const INTERNAL_ROLES: readonly GcmRole[] = [
  "ADMIN",
  "ACCOUNTANT",
  "DATA_ENTRY",
  "LOGISTICS",
  "REPORTS_MANAGER",
  "DRIVER",
];

const ADMIN_ONLY: readonly GcmRole[] = ["ADMIN"];

export const ACCESS_POLICIES: Array<{ prefix: string; roles: readonly GcmRole[] }> = [
  { prefix: "/client", roles: CLIENT_ROLES },
  { prefix: "/subcontractor", roles: ["SUBCONTRACTOR"] },
  { prefix: "/driver", roles: ["DRIVER"] },
  { prefix: "/dashboard", roles: INTERNAL_ROLES },
  { prefix: "/reports-dashboard", roles: ["ADMIN", "REPORTS_MANAGER"] },
  { prefix: "/accountant-portal", roles: ["ADMIN", "ACCOUNTANT"] },
  { prefix: "/settings", roles: ADMIN_ONLY },
  { prefix: "/system-monitor", roles: ADMIN_ONLY },
  { prefix: "/landing-settings", roles: ADMIN_ONLY },
  { prefix: "/equipment-admin", roles: ADMIN_ONLY },
];

export function isGcmRole(value: string | undefined): value is GcmRole {
  if (!value) {
    return false;
  }

  return (GCM_ROLE_VALUES as readonly string[]).includes(value);
}

export function getRoleHome(role: GcmRole): string {
  if (CLIENT_ROLES.includes(role)) {
    return "/client/dashboard";
  }

  if (role === "SUBCONTRACTOR") {
    return "/subcontractor/dashboard";
  }

  if (role === "DRIVER") {
    return "/driver";
  }

  if (role === "ACCOUNTANT") {
    return "/accountant-portal";
  }

  if (role === "REPORTS_MANAGER") {
    return "/reports-dashboard";
  }

  return "/dashboard";
}

export function getRequiredRoles(pathname: string): readonly GcmRole[] | null {
  const matched = ACCESS_POLICIES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return matched?.roles ?? null;
}
