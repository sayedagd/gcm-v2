import DashboardDriverLayout from "@/components/layout/DriverLayout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <DashboardDriverLayout>{children}</DashboardDriverLayout>;
}
