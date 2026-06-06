import type { Metadata } from "next";

export const APP_NAME = "GCM ERP";
export const APP_TITLE_TEMPLATE = `%s | ${APP_NAME}`;
export const APP_DEFAULT_DESCRIPTION = "GCM environmental operations platform";

type RoleEntryScope = "internal" | "client" | "driver" | "subcontractor";

const ROLE_ENTRY_DESCRIPTIONS: Record<RoleEntryScope, string> = {
  internal: "Central operations workspace for planning, monitoring, and execution across business modules.",
  client: "Client operations workspace for service visibility, reporting, and account-level collaboration.",
  driver: "Driver operations workspace for assignments, trip lifecycle updates, and route execution.",
  subcontractor: "Subcontractor operations workspace for assets, profile operations, and delivery commitments.",
};

export const getRoleEntryDescription = (scope: RoleEntryScope): string => {
  return ROLE_ENTRY_DESCRIPTIONS[scope];
};

export const createPageMetadata = (title: string, description: string): Metadata => ({
  title,
  description,
});
