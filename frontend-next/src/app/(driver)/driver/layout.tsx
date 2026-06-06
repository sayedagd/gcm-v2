import type { Metadata } from "next";
import { createPageMetadata, getRoleEntryDescription } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata(
  "Driver Dashboard",
  getRoleEntryDescription("driver"),
);

export default function DriverDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
