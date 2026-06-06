import { Suspense } from "react";
import ReportsDashboardClient from "./ReportsDashboardClient";

export default function ReportsDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading reports dashboard...</div>}>
      <ReportsDashboardClient />
    </Suspense>
  );
}
