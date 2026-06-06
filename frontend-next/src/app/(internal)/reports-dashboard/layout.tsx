import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export const metadata: Metadata = {
  title: "Reports Dashboard",
  description: "Analytics and reporting hub for performance, utilization, and operational KPIs.",
};

export default function ReportsDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
