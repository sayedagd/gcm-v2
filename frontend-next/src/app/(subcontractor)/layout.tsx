import { RouteShell } from "@/features/shell/ui/RouteShell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SubcontractorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteShell title="Subcontractor Portal" subtitle="Subcontractor dashboard and self-service routes">
      {children}
    </RouteShell>
  );
}
