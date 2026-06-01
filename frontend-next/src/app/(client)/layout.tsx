import { RouteShell } from "@/features/shell/ui/RouteShell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteShell title="Client Portal" subtitle="Client dashboard, reports, and account routes">
      {children}
    </RouteShell>
  );
}
