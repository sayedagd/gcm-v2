import type { Metadata } from "next";
import { createPageMetadata, getRoleEntryDescription } from "@/lib/metadata";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = createPageMetadata(
  "Operations Dashboard",
  getRoleEntryDescription("internal"),
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
