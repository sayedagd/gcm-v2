import type { Metadata } from "next";
import { createPageMetadata, getRoleEntryDescription } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata(
  "Subcontractor Dashboard",
  getRoleEntryDescription("subcontractor"),
);

export default function SubcontractorDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
