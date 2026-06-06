import type { Metadata } from "next";
import { createPageMetadata, getRoleEntryDescription } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata(
  "Client Dashboard",
  getRoleEntryDescription("client"),
);

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
