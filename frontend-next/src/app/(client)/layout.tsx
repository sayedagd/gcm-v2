import { ClientLayout as DashboardClientLayout } from "@/components/layout/ClientLayout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
