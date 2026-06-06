import { SubcontractorLayout as DashboardSubcontractorLayout } from "@/components/layout/SubcontractorLayout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SubcontractorLayout({ children }: { children: React.ReactNode }) {
  return <DashboardSubcontractorLayout>{children}</DashboardSubcontractorLayout>;
}
