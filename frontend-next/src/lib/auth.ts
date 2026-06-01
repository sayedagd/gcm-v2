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
  { prefix: "/db", roles: INTERNAL_ROLES },
  { prefix: "/rd", roles: ["ADMIN", "REPORTS_MANAGER"] },
  { prefix: "/acc", roles: ["ADMIN", "ACCOUNTANT"] },
  { prefix: "/st", roles: ADMIN_ONLY },
  { prefix: "/sys", roles: ADMIN_ONLY },
  { prefix: "/le", roles: ADMIN_ONLY },
  { prefix: "/ai-sessions", roles: ADMIN_ONLY },
  { prefix: "/store-admin", roles: ADMIN_ONLY },
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

  if (role === "REPORTS_MANAGER") {
    return "/rd";
  }

  return "/db";
}

export function getRequiredRoles(pathname: string): readonly GcmRole[] | null {
  const matched = ACCESS_POLICIES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return matched?.roles ?? null;
}
